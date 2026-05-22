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


def _build_phase_instruction(phase: Phase, round_num: int, is_provocateur: bool, is_dissenter: bool = False) -> str:
    if phase == Phase.initial:
        return (
            "Give your honest first reaction to this product idea. Share your gut feeling — the first concern or excitement that comes to mind. "
            "This is YOUR view, formed before hearing anyone else. Don't hedge. Don't think about what others would say."
        )
    elif phase == Phase.debate:
        if is_dissenter:
            return (
                "Your role in this discussion is the structural skeptic. Your job is to find what's wrong with this idea — flaws, failure modes, hidden costs, edge cases others are glossing over. "
                "Do this REGARDLESS of how your persona would normally feel. Even if you'd naturally be excited about this product, in THIS conversation your job is to challenge it. "
                "React to specific claims people have made. Name them. Push back hard but fairly — don't be contrarian for sport, actively look for the cracks."
            )
        if is_provocateur:
            return "The last few speakers seem to be reaching agreement. Push back — find the flaw, the edge case, or the concern that your persona would notice that others are glossing over. Be specific."
        return "React to what others have said. You can agree, disagree, or build on a point. If someone said something that resonated or bothered you, address it directly by name."
    elif phase == Phase.synthesis:
        if is_dissenter:
            return (
                "Give your final verdict, but lead with the reasons this product might fail. Even if your persona would normally be enthusiastic, your structural role here is to surface what could go wrong, who it won't work for, and what's being overlooked. Be direct."
            )
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
    is_dissenter: bool = False,
    private_mode: bool = False,
) -> str:
    system_prompt = _build_system_prompt(persona)
    phase_instruction = _build_phase_instruction(phase, round_num, is_provocateur, is_dissenter)

    messages: list[dict] = []

    if private_mode:
        # Private opinion: no group context, no other agents' contributions.
        # Prevents convergence collapse — the agent forms a view before being influenced.
        brief_msg = (
            f"PRODUCT IDEA:\n{product_brief}\n\n"
            f"You're being asked privately for your personal reaction. Nobody else will see your answer before they give theirs. "
            f"There is no group conversation yet."
        )
        messages.append({"role": "user", "content": brief_msg})
        messages.append({"role": "assistant", "content": f"Got it. Here's my honest, independent take as {persona.name}."})
    else:
        brief_msg = f"PRODUCT IDEA BEING DISCUSSED:\n{product_brief}\n\nParticipants in this focus group: {_participant_names(history)}\n\nThe focus group is now in session."
        messages.append({"role": "user", "content": brief_msg})
        messages.append({"role": "assistant", "content": f"I'm {persona.name}, and I'm ready to share my thoughts."})

        # Add history of other agents' messages
        for msg in history[-20:]:
            messages.append({
                "role": "user",
                "content": f"{msg.persona_name} says: {msg.content}"
            })
            if msg.persona_id == persona.id:
                messages.append({"role": "assistant", "content": msg.content})

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
