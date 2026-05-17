/**
 * Provider Types — Shared interfaces for all LLM providers
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMResult {
  content: string;
  usage: LLMUsage;
  model: string;
  provider: string;
  keyIndex: number;
  latencyMs: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiUrl: string;
  defaultModel: string;
  models: string[];
  /** If true, keys are loaded from env (built-in) */
  builtIn: boolean;
}

export interface IProvider {
  readonly config: ProviderConfig;
  readonly availableKeys: number;
  readonly totalKeys: number;

  call(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMResult>;
  callWithKey(
    apiKey: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResult>;
  getStatus(): ProviderStatus;
}

export interface KeyStatus {
  index: number;
  state: "available" | "cooldown" | "exhausted";
  lastError?: string;
  lastStatus?: number;
  cooldownUntil?: number;
  totalCalls: number;
  totalFailures: number;
}

export interface ProviderStatus {
  id: string;
  name: string;
  totalKeys: number;
  availableKeys: number;
  exhaustedKeys: number;
  cooldownKeys: number;
  totalCalls: number;
  keys: KeyStatus[];
}
