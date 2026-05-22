import asyncio
import json
import random
from models import Persona, Message, Phase, WSEvent
from agent import call_agent, COST_PER_TURN_USD


class FocusGroupOrchestrator:
    def __init__(self, session_id: str, personas: list[Persona], product_brief: str, ws_queue: asyncio.Queue):
        self.session_id = session_id
        self.personas = personas
        self.product_brief = product_brief
        self.ws_queue = ws_queue
        self.history: list[Message] = []
        self.turn_count = 0
        self.total_cost = 0.0

    async def run(self):
        try:
            await self._run_phase(Phase.initial, rounds=1)
            await self._run_phase(Phase.debate, rounds=3)
            await self._run_phase(Phase.synthesis, rounds=1)
            await self._emit(WSEvent(type="phase_change", data={"phase": "complete", "message": "Focus group complete. Extracting insights..."}))
        except Exception as e:
            await self._emit(WSEvent(type="error", data={"message": str(e)}))
            raise

    async def _run_phase(self, phase: Phase, rounds: int):
        phase_labels = {
            Phase.initial: "Phase 1: Initial Reactions",
            Phase.debate: "Phase 2: Open Debate",
            Phase.synthesis: "Phase 3: Final Verdicts",
        }
        await self._emit(WSEvent(type="phase_change", data={"phase": phase.value, "label": phase_labels[phase]}))

        for round_num in range(rounds):
            speakers = self._select_speakers_for_round(phase, round_num)
            for i, (persona, is_provocateur) in enumerate(speakers):
                await self._run_turn(persona, phase, round_num, is_provocateur)
                # Small pause between turns for natural pacing
                await asyncio.sleep(0.1)

    def _select_speakers_for_round(self, phase: Phase, round_num: int) -> list[tuple[Persona, bool]]:
        if phase == Phase.initial or phase == Phase.synthesis:
            # All agents speak once, in shuffled order
            order = self.personas[:]
            random.shuffle(order)
            return [(p, False) for p in order]

        # Debate phase: select a subset with weighted turn-taking
        n_speakers = min(len(self.personas), max(6, len(self.personas) // 2))
        speakers: list[tuple[Persona, bool]] = []
        turn_counts = self._get_turn_counts()

        # Check if last message addressed someone by name
        addressed = self._find_addressed_persona()

        pool = self.personas[:]
        random.shuffle(pool)

        for i, persona in enumerate(pool):
            if len(speakers) >= n_speakers:
                break

            # Prioritize addressed persona
            if addressed and persona.id == addressed.id and not any(p.id == persona.id for p, _ in speakers):
                is_provocateur = (len(speakers) > 0 and len(speakers) % 5 == 0)
                speakers.insert(0, (persona, is_provocateur))
                continue

            # Weight by recency (fewer recent turns = higher chance)
            recent_turns = turn_counts.get(persona.id, 0)
            if recent_turns == 0 or random.random() > (recent_turns / (len(self.history) + 1)):
                # Every 5th speaker in debate is a provocateur
                is_provocateur = (len(speakers) > 0 and len(speakers) % 5 == 0)
                speakers.append((persona, is_provocateur))

        # Ensure we have enough speakers
        if len(speakers) < 3:
            remaining = [p for p in pool if not any(s.id == p.id for s, _ in speakers)]
            for p in remaining[:3 - len(speakers)]:
                speakers.append((p, False))

        return speakers

    def _get_turn_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for msg in self.history[-10:]:
            counts[msg.persona_id] = counts.get(msg.persona_id, 0) + 1
        return counts

    def _find_addressed_persona(self) -> Persona | None:
        if not self.history:
            return None
        last_content = self.history[-1].content.lower()
        for persona in self.personas:
            if persona.name.lower() in last_content:
                return persona
        return None

    async def _run_turn(self, persona: Persona, phase: Phase, round_num: int, is_provocateur: bool):
        await self._emit(WSEvent(type="agent_typing", data={
            "persona_id": persona.id,
            "persona_name": persona.name,
            "avatar_color": persona.avatar_color,
        }))

        full_content = ""
        async for token in call_agent(
            persona=persona,
            product_brief=self.product_brief,
            history=self.history,
            phase=phase,
            round_num=round_num,
            is_provocateur=is_provocateur,
        ):
            full_content += token
            await self._emit(WSEvent(type="token", data={
                "persona_id": persona.id,
                "token": token,
            }))

        self.turn_count += 1
        self.total_cost += COST_PER_TURN_USD

        message = Message(
            persona_id=persona.id,
            persona_name=persona.name,
            content=full_content.strip(),
            phase=phase,
            turn=self.turn_count,
            avatar_color=persona.avatar_color,
        )
        self.history.append(message)

        await self._emit(WSEvent(type="message", data={
            "persona_id": persona.id,
            "persona_name": persona.name,
            "persona_age": persona.age,
            "persona_occupation": persona.occupation,
            "persona_location": persona.location,
            "content": message.content,
            "phase": phase.value,
            "turn": self.turn_count,
            "avatar_color": persona.avatar_color,
            "is_provocateur": is_provocateur,
        }))

        await self._emit(WSEvent(type="cost_update", data={
            "total_cost_usd": round(self.total_cost, 4),
            "turn_count": self.turn_count,
        }))

    async def _emit(self, event: WSEvent):
        await self.ws_queue.put(event.model_dump())

    def get_transcript(self) -> str:
        lines = []
        for msg in self.history:
            lines.append(f"[{msg.phase.upper()} - Turn {msg.turn}] {msg.persona_name}: {msg.content}")
        return "\n\n".join(lines)
