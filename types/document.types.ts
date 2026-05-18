/* ── Document Types ────────────────────────────────────── */

export type DocType = "prd" | "research" | "competitive" | "brief" | "problem_statement" | "other";
export type DocStatus = "uploading" | "parsing" | "chunking" | "embedding" | "ready" | "error";

export interface DocumentRecord {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  file_size: number;
  word_count: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  /** Cached analysis result stored as JSONB in Supabase */
  health_data?: Record<string, unknown>;
}

export interface DocumentChunk {
  chunk_id: string;
  doc_id: string;
  doc_name: string;
  doc_type: DocType;
  content: string;
  page?: number;
  section?: string;
  char_start: number;
  char_end: number;
  token_count: number;
  embedding?: number[];
  created_at: string;
}

export interface DocSummary {
  doc_name: string;
  key_themes: string[];
  open_questions: string[];
  key_decisions: string[];
  stakeholders_mentioned: string[];
  word_count: number;
  clarity_score: number;
}

export interface GapReport {
  doc_name: string;
  missing_sections: string[];
  weak_sections: { section: string; reason: string }[];
  completeness_score: number;
}
