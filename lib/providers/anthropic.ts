/**
 * Anthropic Claude Provider (BYOK only — no built-in keys)
 * Uses the Anthropic Messages API
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
  id: "anthropic",
  name: "Anthropic Claude",
  apiUrl: "https://api.anthropic.com",
  defaultModel: "claude-sonnet-4-20250514",
  models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
  builtIn: false,
};

export class AnthropicProvider implements IProvider {
  readonly config = CONFIG;
  private callCount = 0;

  get availableKeys(): number {
    return 0;
  }
  get totalKeys(): number {
    return 0;
  }

  async call(): Promise<LLMResult> {
    throw new Error("[Anthropic] No built-in keys. Use BYOK via Settings.");
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
      `[Anthropic] #${callId} → POST ${CONFIG.apiUrl}/v1/messages (BYOK, model=${model})`
    );

    // Anthropic uses a separate system parameter
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await fetch(`${CONFIG.apiUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.max_tokens ?? 2048,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: nonSystemMsgs,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(
        `[Anthropic] #${callId} ← HTTP ${response.status} (${latencyMs}ms): ${body.slice(0, 200)}`
      );
      throw new Error(
        `API error ${response.status}: ${response.statusText}. ${body.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const content =
      data.content
        ?.map((c: { type: string; text?: string }) =>
          c.type === "text" ? c.text || "" : ""
        )
        .join("") || "";

    const usage = {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };

    console.log(
      `[Anthropic] #${callId} ← HTTP 200 (${latencyMs}ms) ` +
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
