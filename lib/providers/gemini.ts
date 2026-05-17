/**
 * Google Gemini Provider
 * Uses the Gemini REST API (generateContent endpoint)
 * Translates OpenAI-style messages to Gemini format
 */

import { KeyRotator } from "./key-rotator";
import type {
  IProvider,
  LLMMessage,
  LLMCallOptions,
  LLMResult,
  ProviderConfig,
  ProviderStatus,
} from "./types";

const CONFIG: ProviderConfig = {
  id: "gemini",
  name: "Google Gemini",
  apiUrl: "https://generativelanguage.googleapis.com/v1beta",
  defaultModel: "gemini-2.5-flash",
  models: ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  builtIn: true,
};

/** Convert OpenAI-style messages to Gemini format */
function toGeminiPayload(
  messages: LLMMessage[],
  options?: LLMCallOptions
): {
  contents: { role: string; parts: { text: string }[] }[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig: Record<string, unknown>;
} {
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const contents = nonSystemMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Gemini requires alternating user/model turns
  // If two consecutive messages have the same role, merge them
  const merged: typeof contents = [];
  for (const msg of contents) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].parts.push(...msg.parts);
    } else {
      merged.push(msg);
    }
  }

  return {
    contents: merged,
    ...(systemMsg
      ? { systemInstruction: { parts: [{ text: systemMsg.content }] } }
      : {}),
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.max_tokens ?? 2048,
    },
  };
}

export class GeminiProvider implements IProvider {
  readonly config = CONFIG;
  private rotator: KeyRotator;
  private callCount = 0;

  constructor() {
    const keys = (process.env.GEMINI_API_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    this.rotator = new KeyRotator("Gemini", keys);
  }

  get availableKeys(): number {
    return this.rotator.availableCount;
  }
  get totalKeys(): number {
    return this.rotator.keyCount;
  }

  async call(
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResult> {
    for (let i = 0; i < this.rotator.keyCount; i++) {
      const keyInfo = this.rotator.getNextKey();
      if (!keyInfo) break;

      try {
        const result = await this.executeCall(
          keyInfo.key,
          keyInfo.index,
          messages,
          options
        );
        this.rotator.markSuccess(keyInfo.index);
        return result;
      } catch (err) {
        const status = this.extractStatus(err);
        const msg = err instanceof Error ? err.message : String(err);
        this.rotator.markFailed(keyInfo.index, status, msg);

        if (![401, 403, 429].includes(status)) {
          throw err;
        }
      }
    }

    throw new Error(
      `[Gemini] All ${this.rotator.keyCount} keys failed. Add new keys or use another provider.`
    );
  }

  async callWithKey(
    apiKey: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResult> {
    return this.executeCall(apiKey, -1, messages, options);
  }

  getStatus(): ProviderStatus {
    const keys = this.rotator.getStatus();
    return {
      id: CONFIG.id,
      name: CONFIG.name,
      totalKeys: this.rotator.keyCount,
      availableKeys: this.rotator.availableCount,
      exhaustedKeys: keys.filter((k) => k.state === "exhausted").length,
      cooldownKeys: keys.filter((k) => k.state === "cooldown").length,
      totalCalls: this.callCount,
      keys,
    };
  }

  private async executeCall(
    apiKey: string,
    keyIndex: number,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResult> {
    this.callCount++;
    const callId = this.callCount;
    const model = options?.model || CONFIG.defaultModel;
    const start = Date.now();
    const endpoint = `${CONFIG.apiUrl}/models/${model}:generateContent?key=${apiKey}`;

    console.log(
      `[Gemini] #${callId} → POST .../models/${model}:generateContent (key ${keyIndex})`
    );

    const payload = toGeminiPayload(messages, options);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(
        `[Gemini] #${callId} ← HTTP ${response.status} (${latencyMs}ms): ${body.slice(0, 200)}`
      );
      throw new Error(
        `API error ${response.status}: ${response.statusText}. ${body.slice(0, 200)}`
      );
    }

    const data = await response.json();

    // Extract content from Gemini response format
    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") || "";

    // Extract usage from Gemini response
    const usageMetadata = data.usageMetadata || {};
    const usage = {
      prompt_tokens: usageMetadata.promptTokenCount || 0,
      completion_tokens: usageMetadata.candidatesTokenCount || 0,
      total_tokens: usageMetadata.totalTokenCount || 0,
    };

    console.log(
      `[Gemini] #${callId} ← HTTP 200 (${latencyMs}ms) ` +
        `tokens: ${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`
    );

    return {
      content,
      usage,
      model: data.modelVersion || model,
      provider: CONFIG.id,
      keyIndex,
      latencyMs,
    };
  }

  private extractStatus(err: unknown): number {
    const msg = err instanceof Error ? err.message : String(err);
    const match = msg.match(/API error (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}
