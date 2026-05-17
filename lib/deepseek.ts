/**
 * Backward-compatible re-export
 * All provider logic lives in lib/llm.ts and lib/providers/
 */
export { callLLM as callDeepSeek, getLLMStatus } from "./llm";
export type { LLMMessage, LLMCallOptions, LLMResult } from "./llm";
