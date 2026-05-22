import os
from pathlib import Path
import anthropic
from models import Persona, Message, Phase

_client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
_SYSTEM_TEMPLATE = (Path(__file__).parent / "prompts" / "agent_system.txt").read_text()

HAIKU_MODEL = "claude-haiku-4-5-20251001"

# Approximate token cost for Haiku (input + output per turn)
COST_PER_TURN_USD = 0.0008


def _build_system_prompt(persona: Persona) -> str:
    return _SYSTEM_TEMPLATE.format(
        name=persona.name,
        age=persona.age,
        occupation=persona.occupation,
        location=persona.location,
        income_bracket=persona.income_bracket,
        tech_comfort=persona.tech_comfort,
        archetype=persona.archetype,
        pain_points=", ".join(persona.pain_points),
        motivations=", ".join(persona.motivations),
        communication_style=persona.communication_style,
        likely_objections=", ".join(persona.likely_objections),
    )


def _build_phase_instruction(phase: Phase, round_num: int, is_provocateur: bool) -> str:
    if phase == Phase.initial:
        return "Give your honest first reaction to this product idea. Share your gut feeling and the first concern or excitement that comes to mind."
    elif phase == Phase.debate:
        if is_provocateur:
            return "The last few speakers seem to be reaching agreement. Push back — find the flaw, the edge case, or the concern that your persona would notice that others are glossing over. Be specific."
        return "React to what others have said. You can agree, disagree, or build on a point. If someone said something that resonated or bothered you, address it directly by name."
    elif phase == Phase.synthesis:
        return "Give your final verdict. Would you use this product? What would need to change for you to say yes (or stay yes)? Be direct."
    return ""


def _format_history(history: list[Message]) -> list[dict]:
    formatted = []
    for msg in history:
        formatted.append({
            "role": "user",
            "content": f"[Focus group facilitator]: The discussion continues. {msg.persona_name} says:"
        })
        formatted.append({
            "role": "assistant",
            "content": msg.content
        })
    return formatted


async def call_agent(
    persona: Persona,
    product_brief: str,
    history: list[Message],
    phase: Phase,
    round_num: int,
    is_provocateur: bool = False,
) -> str:
    system_prompt = _build_system_prompt(persona)
    phase_instruction = _build_phase_instruction(phase, round_num, is_provocateur)

    # Build the messages array
    messages: list[dict] = []

    # Add product brief as first user message
    brief_msg = f"PRODUCT IDEA BEING DISCUSSED:\n{product_brief}\n\nParticipants in this focus group: {_participant_names(history)}\n\nThe focus group is now in session."
    messages.append({"role": "user", "content": brief_msg})
    messages.append({"role": "assistant", "content": f"I'm {persona.name}, and I'm ready to share my thoughts."})

    # Add history of other agents' messages
    for msg in history[-20:]:  # cap context to last 20 messages
        messages.append({
            "role": "user",
            "content": f"{msg.persona_name} says: {msg.content}"
        })
        if msg.persona_id == persona.id:
            messages.append({"role": "assistant", "content": msg.content})

    # Final instruction
    messages.append({"role": "user", "content": phase_instruction})

    async with _client.messages.stream(
        model=HAIKU_MODEL,
        max_tokens=300,
        system=system_prompt,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


def _participant_names(history: list[Message]) -> str:
    seen = {}
    for msg in history:
        seen[msg.persona_id] = msg.persona_name
    names = list(seen.values())
    if not names:
        return "various participants"
    return ", ".join(names[:8]) + ("..." if len(names) > 8 else "")
