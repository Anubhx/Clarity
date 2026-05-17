/**
 * DeepSeek Provider
 * Implements OpenAI-compatible chat completions API
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
  id: "deepseek",
  name: "DeepSeek",
  apiUrl: "https://api.deepseek.com",
  defaultModel: "deepseek-chat",
  models: ["deepseek-chat", "deepseek-coder"],
  builtIn: true,
};

export class DeepSeekProvider implements IProvider {
  readonly config = CONFIG;
  private rotator: KeyRotator;
  private callCount = 0;

  constructor() {
    const keys = (process.env.DEEPSEEK_API_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    this.rotator = new KeyRotator("DeepSeek", keys);
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

        // Non-key errors (network, 500) — don't try next key
        if (![401, 402, 403, 429].includes(status)) {
          throw err;
        }
      }
    }

    throw new Error(
      `[DeepSeek] All ${this.rotator.keyCount} keys failed. Add new keys or use another provider.`
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

    console.log(
      `[DeepSeek] #${callId} → POST ${CONFIG.apiUrl}/v1/chat/completions ` +
        `(key ${keyIndex}, model=${model})`
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
        `[DeepSeek] #${callId} ← HTTP ${response.status} (${latencyMs}ms): ${body.slice(0, 200)}`
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
      `[DeepSeek] #${callId} ← HTTP 200 (${latencyMs}ms) ` +
        `tokens: ${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`
    );

    return {
      content,
      usage,
      model: data.model || model,
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
