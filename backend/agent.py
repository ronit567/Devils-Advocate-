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
            "Imagine someone just showed you this product and asked: would you use it? "
            "React from your own life — not as an expert, but as someone deciding whether this belongs in your daily routine. "
            "What's your gut? Would you actually use it? In what specific situation? What worries you about it? "
            "This is YOUR view, formed privately before anyone else speaks. Don't hedge. Talk about your own life — your job, your home, your habits. Avoid any business or strategy talk."
        )
    elif phase == Phase.debate:
        if is_dissenter:
            return (
                "Your role here is to be the customer who would NOT use this product. Whatever your persona would normally feel, in this conversation you're the holdout. "
                "Push back on what others have said — but from a CUSTOMER's seat, not a strategist's. Talk about why YOU personally wouldn't use it: it doesn't fit your life, you don't trust it, it costs too much for what you'd get, you already have something that works, your family would think it's weird, you tried something like it and it failed for you. "
                "Address specific people by name. Be concrete about your own life. Do NOT critique the business model or market — react like a real human being who isn't sold on this."
            )
        if is_provocateur:
            return (
                "The last few speakers seem to be agreeing. Push back from your own life — a moment where this wouldn't work for you, a hassle they're glossing over, a reason YOU personally wouldn't use it. "
                "Address whoever you're reacting to by name. Be specific to your own routine, not abstract."
            )
        return (
            "React to what others have said. Agree if you genuinely would; push back if you wouldn't. "
            "Talk about your OWN life — when you'd use this, when you wouldn't, what you'd compare it to, what you've tried before that worked or didn't. "
            "If someone said something that resonated or bothered you, address them by name. "
            "You're a customer in a focus group, not a business analyst. No strategy talk."
        )
    elif phase == Phase.synthesis:
        if is_dissenter:
            return (
                "Give your final answer as the customer who wouldn't buy this. Lead with the personal reasons it doesn't fit your life. "
                "What would have to change about the PRODUCT (not the marketing or business) for you to actually try it? Be direct, talk about yourself, not the market."
            )
        return (
            "Give your final answer. Would you actually use this product? How often? What would you pay for it? "
            "If yes, what specifically about your life makes it a fit. If no, what would need to change about the product itself to flip you. Be direct and personal."
        )
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
