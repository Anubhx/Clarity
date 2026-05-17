/**
 * OpenAI Provider (BYOK only — no built-in keys)
 * Compatible with OpenAI Chat Completions API
 */

import type {
  IProvider,
  LLMMessage,
  LLMCallOptions,
  LLMResult,
  ProviderConfig,
  ProviderStatus,
} from "./types";

const CONFIG: ProviderConfig = {
  id: "openai",
  name: "OpenAI",
  apiUrl: "https://api.openai.com",
  defaultModel: "gpt-4o-mini",
  models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  builtIn: false,
};

export class OpenAIProvider implements IProvider {
  readonly config = CONFIG;
  private callCount = 0;

  get availableKeys(): number {
    return 0; // BYOK only
  }
  get totalKeys(): number {
    return 0;
  }

  async call(): Promise<LLMResult> {
    throw new Error("[OpenAI] No built-in keys. Use BYOK via Settings.");
  }

  async callWithKey(
    apiKey: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResult> {
    this.callCount++;
    const callId = this.callCount;
    const model = options?.model || CONFIG.defaultModel;
    const start = Date.now();

    console.log(
      `[OpenAI] #${callId} → POST ${CONFIG.apiUrl}/v1/chat/completions (BYOK, model=${model})`
    );

    const response = await fetch(`${CONFIG.apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 2048,
        stream: false,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(
        `[OpenAI] #${callId} ← HTTP ${response.status} (${latencyMs}ms): ${body.slice(0, 200)}`
      );
      throw new Error(
        `API error ${response.status}: ${response.statusText}. ${body.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    console.log(
      `[OpenAI] #${callId} ← HTTP 200 (${latencyMs}ms) ` +
        `tokens: ${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`
    );

    return { content, usage, model: data.model || model, provider: CONFIG.id, keyIndex: -1, latencyMs };
  }

  getStatus(): ProviderStatus {
    return {
      id: CONFIG.id,
      name: CONFIG.name,
      totalKeys: 0,
      availableKeys: 0,
      exhaustedKeys: 0,
      cooldownKeys: 0,
      totalCalls: this.callCount,
      keys: [],
    };
  }
}
