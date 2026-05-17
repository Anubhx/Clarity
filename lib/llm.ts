/**
 * LLM Manager — Orchestrates provider selection, fallback, and BYOK
 *
 * Flow:
 *   1. If MOCK_LLM=true → return mock response
 *   2. If BYOK key provided → use that provider directly
 *   3. Try built-in providers in priority order (DeepSeek → Gemini)
 *   4. If all fail → return detailed error message
 */

import {
  getProvider,
  getBuiltInProviders,
  getAllProviderStatuses,
  BUILTIN_PRIORITY,
  type LLMMessage,
  type LLMCallOptions,
  type LLMResult,
  type ProviderStatus,
} from "./providers";

/* ── Types ────────────────────────────────────────────── */

export type { LLMMessage, LLMCallOptions, LLMResult };

export interface LLMManagerOptions extends LLMCallOptions {
  /** BYOK: provider ID to use (e.g., "openai", "gemini") */
  byokProvider?: string;
  /** BYOK: API key */
  byokKey?: string;
}

/* ── Mock Mode ────────────────────────────────────────── */

const MOCK_MODE = process.env.MOCK_LLM === "true";

function generateMockResponse(messages: LLMMessage[]): LLMResult {
  const userMsg = messages.find((m) => m.role === "user")?.content || "";
  const hasContext = userMsg.includes("DOCUMENT CONTEXT:");

  let content: string;
  if (!hasContext) {
    content =
      "I need documents to answer your question. Please upload some documents first.";
  } else {
    const questionMatch = userMsg.match(/USER QUESTION:\s*(.*)/s);
    const question = questionMatch?.[1]?.trim() || "your question";
    content =
      `Based on the uploaded documents, here is what I found regarding "${question}":\n\n` +
      `The documents contain relevant information about this topic. Key findings include ` +
      `sections covering user experience pain points, design decisions, and technical requirements.\n\n` +
      `**Note:** This is a mock response (MOCK_LLM=true). Set it to false and configure valid API keys for real AI responses.\n\n` +
      `---CITATIONS---\n` +
      `[{"claim":"Mock citation from document context","doc_name":"Uploaded Document","section":"Overview","excerpt":"This is a placeholder citation from the mock LLM."}]\n` +
      `---END_CITATIONS---`;
  }

  return {
    content,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: "mock",
    provider: "mock",
    keyIndex: -1,
    latencyMs: 5,
  };
}

/* ── Call Counter ──────────────────────────────────────── */

let globalCallCount = 0;

/* ── Main Export ──────────────────────────────────────── */

export async function callLLM(
  messages: LLMMessage[],
  options?: LLMManagerOptions
): Promise<string> {
  globalCallCount++;
  const callId = globalCallCount;
  const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const estimatedTokens = Math.ceil(inputChars / 4);

  console.log(`\n[LLM] ═══ Call #${callId} ═══════════════════════`);
  console.log(
    `[LLM] Messages: ${messages.length} (${inputChars} chars, ~${estimatedTokens} tokens)`
  );

  // ── Mock mode ──
  if (MOCK_MODE && !options?.byokKey) {
    console.log(`[LLM] 🟡 MOCK MODE — no API calls`);
    const mock = generateMockResponse(messages);
    console.log(`[LLM] ═══ Call #${callId} complete (mock) ═══\n`);
    return mock.content;
  }

  // ── BYOK ──
  if (options?.byokKey && options?.byokProvider) {
    const provider = getProvider(options.byokProvider);
    if (!provider) {
      throw new Error(`Unknown provider: ${options.byokProvider}`);
    }

    console.log(
      `[LLM] Provider: ${provider.config.name} (BYOK)`
    );

    try {
      const result = await provider.callWithKey(options.byokKey, messages, options);
      console.log(
        `[LLM] ✅ ${provider.config.name} BYOK success — ${result.usage.total_tokens} tokens (${result.latencyMs}ms)`
      );
      console.log(`[LLM] ═══ Call #${callId} complete ═══\n`);
      return result.content;
    } catch (err) {
      console.log(`[LLM] ❌ ${provider.config.name} BYOK failed: ${err}`);
      throw err;
    }
  }

  // ── Built-in provider cascade ──
  const builtInProviders = getBuiltInProviders();
  console.log(
    `[LLM] Built-in providers available: ${builtInProviders.map((p) => `${p.config.name}(${p.availableKeys}/${p.totalKeys})`).join(", ") || "none"}`
  );

  const errors: { provider: string; error: string }[] = [];

  for (const provider of builtInProviders) {
    if (provider.availableKeys === 0) {
      console.log(
        `[LLM] ⏭ Skipping ${provider.config.name} — no available keys`
      );
      errors.push({
        provider: provider.config.name,
        error: "All keys exhausted",
      });
      continue;
    }

    console.log(
      `[LLM] Trying ${provider.config.name} (${provider.availableKeys}/${provider.totalKeys} keys)...`
    );

    try {
      const result = await provider.call(messages, options);
      console.log(
        `[LLM] ✅ ${provider.config.name} success — ${result.usage.total_tokens} tokens (${result.latencyMs}ms)`
      );
      console.log(`[LLM] ═══ Call #${callId} complete ═══\n`);
      return result.content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[LLM] ❌ ${provider.config.name} failed: ${msg.slice(0, 150)}`);
      errors.push({ provider: provider.config.name, error: msg.slice(0, 100) });
    }
  }

  // ── All providers failed ──
  const errorSummary = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join(" | ");

  console.log(`[LLM] ❌ ALL PROVIDERS FAILED`);
  console.log(`[LLM] ═══ Call #${callId} FAILED ═══\n`);

  throw new Error(
    `All built-in AI providers failed (${errorSummary}). ` +
      `Add new API keys to .env.local (DEEPSEEK_API_KEYS or GEMINI_API_KEYS), ` +
      `or add your own key in Settings → AI & API.`
  );
}

/** Backward-compatible alias */
export const callDeepSeek = callLLM;

/* ── Status ───────────────────────────────────────────── */

export function getLLMStatus(): {
  mode: string;
  totalCalls: number;
  builtInPriority: string[];
  providers: ProviderStatus[];
} {
  return {
    mode: MOCK_MODE ? "mock" : "live",
    totalCalls: globalCallCount,
    builtInPriority: BUILTIN_PRIORITY,
    providers: getAllProviderStatuses(),
  };
}
