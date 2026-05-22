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
        max_tokens=4000,
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

    prompt = f"""You are a blunt, senior product strategist. Based on this focus group analysis, write exactly 3 bullet points as an executive recommendation for the product team.

PRODUCT BRIEF:
{product_brief}

KEY INSIGHTS:
{insights_summary}

Rules:
- Be direct. No corporate hedging.
- If there's a fatal flaw, lead with it.
- Each bullet is 1-2 sentences max.
- Format: Return a JSON array of 3 strings. Raw JSON only, no markdown.
- Example: ["The pricing model will kill adoption in the SMB segment — 70% of participants cited cost as a dealbreaker.", "The core value prop resonates strongly with tech-savvy users but falls apart for anyone with under 3/5 tech comfort.", "Invest in onboarding before launch — 8 of 20 participants said they'd abandon the product in the first week."]"""

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
