import json
import os
from pathlib import Path
import anthropic
from models import (
    Persona, Message, InsightReport, AgentSentiment,
    ConsensusPoint, ControversyPoint, NonObviousInsight,
    UnmetNeed, FatalFlaw, SurprisingAgreement,
)

_client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
_EXTRACTION_TEMPLATE = (Path(__file__).parent / "prompts" / "insight_extraction.txt").read_text()

SONNET_MODEL = "claude-sonnet-4-6"


async def extract_insights(
    product_brief: str,
    history: list[Message],
    personas: list[Persona],
) -> InsightReport:
    transcript = "\n\n".join(
        f"[{m.phase.upper()} - Turn {m.turn}] {m.persona_name}: {m.content}"
        for m in history
    )

    # Pass 1: Structural analysis
    structural = await _run_structural_analysis(product_brief, transcript)

    # Pass 2: Per-agent sentiment
    sentiments = await _run_sentiment_analysis(product_brief, transcript, personas)

    # Pass 3: Executive summary
    executive_summary = await _run_executive_summary(product_brief, transcript, structural)

    return InsightReport(
        consensus_points=structural.get("consensus_points", []),
        controversy_points=structural.get("controversy_points", []),
        non_obvious_insights=structural.get("non_obvious_insights", []),
        unmet_needs=structural.get("unmet_needs", []),
        fatal_flaws=structural.get("fatal_flaws", []),
        surprising_agreements=structural.get("surprising_agreements", []),
        agent_sentiments=sentiments,
        executive_summary=executive_summary,
    )


async def _run_structural_analysis(product_brief: str, transcript: str) -> dict:
    prompt = (
        _EXTRACTION_TEMPLATE
        .replace("{product_brief}", product_brief)
        .replace("{transcript}", transcript)
    )
    response = await _client.messages.create(
        model=SONNET_MODEL,
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


async def _run_sentiment_analysis(
    product_brief: str,
    transcript: str,
    personas: list[Persona],
) -> list[AgentSentiment]:
    persona_list = "\n".join(
        f"- {p.name} ({p.age}, {p.occupation}, archetype: {p.archetype})"
        for p in personas
    )
    prompt = f"""You are analyzing a customer focus group transcript. For each participant listed below, extract their sentiment toward the product.

PRODUCT BRIEF:
{product_brief}

PARTICIPANTS:
{persona_list}

TRANSCRIPT:
{transcript}

Return a JSON array — one object per participant — with this schema:
[
  {{
    "agent_id": "persona_id_here",
    "agent_name": "string",
    "overall_sentiment": -0.5,
    "would_buy": true,
    "price_sensitivity": "low|medium|high",
    "top_concern": "string",
    "top_delight": "string"
  }}
]

Use agent_id values from this mapping:
{json.dumps({p.name: p.id for p in personas})}

Return raw JSON only, no markdown."""

    response = await _client.messages.create(
        model=SONNET_MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    persona_map = {p.id: p for p in personas}
    sentiment_data = json.loads(raw)
    result = []
    for item in sentiment_data:
        persona = persona_map.get(item.get("agent_id", ""))
        result.append(AgentSentiment(
            agent_id=item.get("agent_id", ""),
            agent_name=item.get("agent_name", ""),
            overall_sentiment=float(item.get("overall_sentiment", 0)),
            would_buy=bool(item.get("would_buy", False)),
            price_sensitivity=item.get("price_sensitivity", "medium"),
            top_concern=item.get("top_concern", ""),
            top_delight=item.get("top_delight", ""),
            avatar_color=persona.avatar_color if persona else "#888888",
        ))
    return result


async def _run_executive_summary(
    product_brief: str,
    transcript: str,
    structural: dict,
) -> list[str]:
    insights_summary = json.dumps({
        "fatal_flaws": structural.get("fatal_flaws", []),
        "non_obvious_insights": structural.get("non_obvious_insights", []),
        "consensus_points": structural.get("consensus_points", []),
    }, indent=2)

    prompt = f"""You are a blunt, senior product strategist writing a 30-second briefing for a founder who is about to make a real decision. Vagueness costs them money.

PRODUCT BRIEF:
{product_brief}

KEY INSIGHTS:
{insights_summary}

Write 3-5 bullets, ranked by importance, that pass this test: "If the founder read only this bullet, would they know what to do differently tomorrow?"

HISTORICAL PRECEDENT (CHECK FIRST — REASONING AID ONLY):
Scan the KEY INSIGHTS for any reference to a real historical product (Google Glass, Quibi, Juicero, Theranos, Segway, Magic Leap, HoloLens, Fitbit, Oculus, Alexa, etc.). If 2+ agents independently named the same one, that convergence is the most important signal — your FIRST bullet MUST surface the known failure modes of that analog (e.g., for a Google Glass-like product: public-recording stigma, $1500+ price-to-utility gap, social stigma of wearing a visible camera, battery dying within a workday, prescription incompatibility, getting kicked out of public venues). The second bullet should usually propose the pivot to whatever vertical that analog eventually worked in (e.g., warehouse picking, surgical guidance, field repair, enterprise tools).

HARD CONSTRAINT: NEVER name a historical product brand in your output bullets. No "Google Glass", "Quibi", "Juicero", "Theranos", "Magic Leap", "HoloLens", "Segway", "Fitbit", "Oculus", "Alexa", or any other brand. The analog is your reasoning aid — it shapes WHAT to surface, but it does not appear in the prose. Translate the precedent into a present-tense finding about THIS product. Describe pivots by the vertical, not by who made that pivot work.

WRITING RULES:
- Lead with action, then evidence. ("Drop the freemium tier — 4 of 6 paying-intent agents said it would erase their willingness to pay.")
- Use specific numbers ("4 of 6 agents", "both Gen Z participants"). Never "many", "some", "a number of".
- Name segments or personas — never "users" or "people".
- No hedging. Banned: "might", "could potentially", "may suggest", "seems to indicate".
- No consultant-speak. Banned: "leverage", "optimize for", "ensure that", "going forward", "robust", "holistic", "key takeaway".
- Delete generic bullets. If it could apply to any product without changing a word, cut it.
- If there is a fatal flaw, lead with it AND name the fix.
- Each bullet is 1-2 punchy sentences max.

OUTPUT: JSON array of 3-5 strings. Raw JSON only, no markdown.

GOOD examples:
["Drop the $9.99/mo tier — 4 of 6 cost-sensitive agents said it kills adoption; test a one-time $29 unlock instead.",
 "The brand only works because of the school partnership; without it, all 3 parent personas refused to engage — make that integration a launch requirement, not a roadmap item.",
 "Power users (Marcus, Priya) wanted depth; casual users (the 3 parents) wanted speed. You cannot serve both with this design — pick a segment before building."]"""

    response = await _client.messages.create(
        model=SONNET_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)
