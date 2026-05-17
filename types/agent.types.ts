/* ── Agent Types ───────────────────────────────────────── */

export type AgentState =
  | "idle"
  | "listening"
  | "intent_classified"
  | "tool_executing"
  | "generating"
  | "streaming"
  | "done"
  | "error"
  | "retry"
  | "fallback";

export type AgentIntent =
  | "retrieval"
  | "contradiction"
  | "summary"
  | "gap_finder"
  | "drive"
  | "ambiguous";

export interface AgentStatus {
  state: AgentState;
  agent: string;
  message: string;
  progress?: number;
}

export interface Conflict {
  topic: string;
  doc_a: { name: string; claim: string; chunk_id: string };
  doc_b: { name: string; claim: string; chunk_id: string };
  severity: "low" | "medium" | "high";
}

export interface ConflictReport {
  conflict_count: number;
  conflicts: Conflict[];
}
