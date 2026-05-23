from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Phase(str, Enum):
    initial = "initial"
    debate = "debate"
    synthesis = "synthesis"
    complete = "complete"


class Persona(BaseModel):
    id: str
    name: str
    age: int
    occupation: str
    location: str
    income_bracket: str  # low | middle | high
    archetype: str
    tech_comfort: int  # 1-5
    pain_points: list[str]
    motivations: list[str]
    communication_style: str
    likely_objections: list[str]
    avatar_color: str


class Message(BaseModel):
    persona_id: str
    persona_name: str
    content: str
    phase: Phase
    turn: int
    avatar_color: str


class Quote(BaseModel):
    agent_name: str
    quote: str


class ConsensusPoint(BaseModel):
    insight: str
    supporting_agents: list[str]
    confidence: float
    supporting_quotes: list[Quote] = []


class ControversyPoint(BaseModel):
    topic: str
    pro_agents: list[str]
    con_agents: list[str]
    why_it_matters: str
    supporting_quotes: list[Quote] = []


class NonObviousInsight(BaseModel):
    insight: str
    why_non_obvious: str
    evidence: str
    supporting_quotes: list[Quote] = []


class UnmetNeed(BaseModel):
    need: str
    expressed_by_archetype: str
    product_implication: str
    supporting_quotes: list[Quote] = []


class FatalFlaw(BaseModel):
    flaw: str
    severity: str  # high | medium | low
    which_segments_care: list[str]
    supporting_quotes: list[Quote] = []


class SurprisingAgreement(BaseModel):
    topic: str
    agents_who_agreed: list[str]
    why_surprising: str
    supporting_quotes: list[Quote] = []


class AgentSentiment(BaseModel):
    agent_id: str
    agent_name: str
    overall_sentiment: float  # -1 to 1
    would_buy: bool
    price_sensitivity: str  # low | medium | high
    top_concern: str
    top_delight: str
    avatar_color: str


class InsightReport(BaseModel):
    consensus_points: list[ConsensusPoint]
    controversy_points: list[ControversyPoint]
    non_obvious_insights: list[NonObviousInsight]
    unmet_needs: list[UnmetNeed]
    fatal_flaws: list[FatalFlaw]
    surprising_agreements: list[SurprisingAgreement]
    agent_sentiments: list[AgentSentiment]
    executive_summary: list[str]


class SessionStatus(str, Enum):
    pending = "pending"
    running = "running"
    extracting = "extracting"
    complete = "complete"
    error = "error"


class StructuredBrief(BaseModel):
    pricing: Optional[str] = None
    target_users: Optional[str] = None
    key_features: Optional[str] = None


class Attachment(BaseModel):
    type: str  # "image" | "pdf" | "text"
    name: str
    # For images: raw base64 (no data URL prefix) + media_type (e.g. image/png)
    # For pdf/text: extracted plain-text content
    content: str
    media_type: Optional[str] = None


class SessionCreate(BaseModel):
    product_brief: str
    num_agents: int = 20
    structured: Optional[StructuredBrief] = None
    attachments: list[Attachment] = []


class SessionResponse(BaseModel):
    session_id: str
    status: SessionStatus


class WSEvent(BaseModel):
    type: str  # "message" | "phase_change" | "agent_typing" | "cost_update" | "complete" | "error"
    data: dict
