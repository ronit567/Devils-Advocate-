import asyncio
import base64
import io
import json
import uuid
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

from models import SessionCreate, SessionResponse, SessionStatus, InsightReport, Attachment, Persona
from persona_loader import (
    select_personas,
    load_default_personas,
    load_custom_personas,
    save_custom_personas,
)
from orchestrator import FocusGroupOrchestrator
from insight_extractor import extract_insights


def _process_attachment(att: Attachment) -> Attachment:
    """For PDFs, decode the base64 content and extract text. Images and text pass through."""
    if att.type == "pdf":
        try:
            pdf_bytes = base64.b64decode(att.content)
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text = "\n\n".join((page.extract_text() or "") for page in reader.pages)
            return Attachment(type="pdf", name=att.name, content=text.strip())
        except Exception as e:
            return Attachment(type="text", name=att.name, content=f"[Failed to extract PDF: {e}]")
    return att

# In-memory session store (sufficient for hackathon)
sessions: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Devil's Advocate API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/session", response_model=SessionResponse)
async def create_session(body: SessionCreate):
    session_id = str(uuid.uuid4())
    personas = select_personas(min(body.num_agents, 70))
    processed_attachments = [_process_attachment(a) for a in body.attachments]

    sessions[session_id] = {
        "status": SessionStatus.pending,
        "product_brief": body.product_brief,
        "structured": body.structured.model_dump() if body.structured else None,
        "attachments": [a.model_dump() for a in processed_attachments],
        "personas": personas,
        "history": [],
        "insights": None,
        "ws_queue": None,
        "task": None,
    }

    return SessionResponse(session_id=session_id, status=SessionStatus.pending)


@app.get("/session/{session_id}/insights")
async def get_insights(session_id: str):
    session = _get_session(session_id)
    if session["insights"] is None:
        raise HTTPException(status_code=202, detail="Insights not yet available")
    return session["insights"]


@app.get("/session/{session_id}/status")
async def get_status(session_id: str):
    session = _get_session(session_id)
    return {"status": session["status"], "turn_count": len(session["history"])}


@app.websocket("/session/{session_id}/stream")
async def websocket_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()

    session = sessions.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "data": {"message": "Session not found"}})
        await websocket.close()
        return

    ws_queue: asyncio.Queue = asyncio.Queue()
    session["ws_queue"] = ws_queue
    session["status"] = SessionStatus.running

    # Send personas first so the frontend can place all nodes before the conversation starts
    await ws_queue.put({
        "type": "personas_loaded",
        "data": {
            "personas": [
                {
                    "id": p.id,
                    "name": p.name,
                    "age": p.age,
                    "occupation": p.occupation,
                    "location": p.location,
                    "archetype": p.archetype,
                    "avatar_color": p.avatar_color,
                }
                for p in session["personas"]
            ]
        },
    })

    orchestrator = FocusGroupOrchestrator(
        session_id=session_id,
        personas=session["personas"],
        product_brief=session["product_brief"],
        ws_queue=ws_queue,
        structured=session.get("structured"),
        attachments=session.get("attachments", []),
    )

    # Run orchestration in background
    async def run_orchestration():
        try:
            await orchestrator.run()
            session["history"] = orchestrator.history
            session["status"] = SessionStatus.extracting

            # Extract insights
            insights = await extract_insights(
                product_brief=session["product_brief"],
                history=orchestrator.history,
                personas=session["personas"],
            )
            session["insights"] = insights.model_dump()
            session["status"] = SessionStatus.complete

            await ws_queue.put({
                "type": "insights_ready",
                "data": insights.model_dump(),
            })
            await ws_queue.put({"type": "complete", "data": {}})
        except Exception as e:
            session["status"] = SessionStatus.error
            await ws_queue.put({"type": "error", "data": {"message": str(e)}})

    task = asyncio.create_task(run_orchestration())
    session["task"] = task

    try:
        while True:
            # Send queued events to client
            try:
                event = await asyncio.wait_for(ws_queue.get(), timeout=1.0)
                await websocket.send_json(event)
                if event.get("type") == "complete":
                    break
            except asyncio.TimeoutError:
                # Check if client is still connected
                try:
                    await websocket.send_json({"type": "ping", "data": {}})
                except Exception:
                    break
    except WebSocketDisconnect:
        task.cancel()
    finally:
        if not task.done():
            task.cancel()


def _get_session(session_id: str) -> dict:
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.get("/health")
async def health():
    return {"status": "ok"}


# --- Custom persona management ---

@app.get("/personas")
async def list_personas():
    return {
        "default": [p.model_dump() for p in load_default_personas()],
        "custom": [p.model_dump() for p in load_custom_personas()],
    }


@app.post("/personas/custom", response_model=Persona)
async def create_custom_persona(persona: Persona):
    custom = load_custom_personas()
    # Reject duplicate IDs
    if any(p.id == persona.id for p in custom):
        raise HTTPException(status_code=409, detail="A custom persona with this id already exists")
    custom.append(persona)
    save_custom_personas(custom)
    return persona


@app.delete("/personas/custom/{persona_id}")
async def delete_custom_persona(persona_id: str):
    custom = load_custom_personas()
    filtered = [p for p in custom if p.id != persona_id]
    if len(filtered) == len(custom):
        raise HTTPException(status_code=404, detail="Custom persona not found")
    save_custom_personas(filtered)
    return {"ok": True}
