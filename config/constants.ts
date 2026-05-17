/* ── Chunking ─────────────────────────────────────────── */
export const CHUNK_SIZES = {
  prd: { size: 512, overlap: 128 },
  research: { size: 256, overlap: 64 },
  competitive: { size: 512, overlap: 128 },
  brief: { size: 512, overlap: 128 },
  problem_statement: { size: 128, overlap: 32 },
  default: { size: 512, overlap: 128 },
} as const;

/* ── Model ────────────────────────────────────────────── */
export const DEEPSEEK_MODEL = "deepseek-chat";
export const DEEPSEEK_API_URL = "https://api.deepseek.com";
export const EMBEDDING_DIMENSIONS = 1536;

/* ── Retrieval ────────────────────────────────────────── */
export const DEFAULT_TOP_K = 8;
export const RERANK_TOP_K = 5;
export const MIN_SIMILARITY_THRESHOLD = 0.6;

/* ── Limits ───────────────────────────────────────────── */
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

/* ── Rate Limiting ────────────────────────────────────── */
export const CHAT_RATE_LIMIT = 10; // requests per minute per session

/* ── Document Types ───────────────────────────────────── */
export const DOC_TYPE_LABELS: Record<string, string> = {
  prd: "PRD",
  research: "Research",
  competitive: "Competitive",
  brief: "Brief",
  problem_statement: "Problem",
  other: "Document",
};
