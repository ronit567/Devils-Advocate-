export type Phase = "initial" | "debate" | "synthesis" | "complete" | "extracting";

export interface AgentMessage {
  persona_id: string;
  persona_name: string;
  persona_age: number;
  persona_occupation: string;
  persona_location: string;
  content: string;
  phase: Phase;
  turn: number;
  avatar_color: string;
  is_provocateur: boolean;
}

export interface AgentSentiment {
  agent_id: string;
  agent_name: string;
  overall_sentiment: number;
  would_buy: boolean;
  price_sensitivity: "low" | "medium" | "high";
  top_concern: string;
  top_delight: string;
  avatar_color: string;
}

export interface InsightReport {
  consensus_points: Array<{
    insight: string;
    supporting_agents: string[];
    confidence: number;
  }>;
  controversy_points: Array<{
    topic: string;
    pro_agents: string[];
    con_agents: string[];
    why_it_matters: string;
  }>;
  non_obvious_insights: Array<{
    insight: string;
    why_non_obvious: string;
    evidence: string;
  }>;
  unmet_needs: Array<{
    need: string;
    expressed_by_archetype: string;
    product_implication: string;
  }>;
  fatal_flaws: Array<{
    flaw: string;
    severity: "high" | "medium" | "low";
    which_segments_care: string[];
  }>;
  surprising_agreements: Array<{
    topic: string;
    agents_who_agreed: string[];
    why_surprising: string;
  }>;
  agent_sentiments: AgentSentiment[];
  executive_summary: string[];
}

export type WSEventType =
  | "message"
  | "token"
  | "agent_typing"
  | "phase_change"
  | "cost_update"
  | "insights_ready"
  | "complete"
  | "error"
  | "ping";

export interface WSEvent {
  type: WSEventType;
  data: Record<string, unknown>;
}
