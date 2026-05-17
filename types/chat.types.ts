/* ── Chat Types ────────────────────────────────────────── */

export interface Citation {
  claim: string;
  doc_name: string;
  chunk_id: string;
  page?: number;
  section?: string;
  excerpt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: number;
  sources_used?: string[];
  created_at: string;
  is_streaming?: boolean;
}

export interface ConversationHistory {
  messages: Message[];
}

export interface ChatRequest {
  message: string;
  conversation_history: Message[];
  document_ids?: string[];
}

export interface SuggestedQuestion {
  text: string;
  intent: "retrieval" | "contradiction" | "summary" | "gap";
}
