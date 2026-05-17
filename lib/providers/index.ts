/**
 * Provider Registry — Central registry of all LLM providers
 */

import { DeepSeekProvider } from "./deepseek";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import type { IProvider, ProviderStatus } from "./types";

export type { IProvider, LLMMessage, LLMCallOptions, LLMResult, ProviderStatus } from "./types";

/** All registered providers */
const providers: Record<string, IProvider> = {
  deepseek: new DeepSeekProvider(),
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
};

/** Built-in provider priority (DeepSeek first, then Gemini) */
export const BUILTIN_PRIORITY: string[] = ["deepseek", "gemini"];

/** Get a provider by ID */
export function getProvider(id: string): IProvider | undefined {
  return providers[id];
}

/** Get all providers */
export function getAllProviders(): IProvider[] {
  return Object.values(providers);
}

/** Get providers that have built-in keys configured */
export function getBuiltInProviders(): IProvider[] {
  return BUILTIN_PRIORITY
    .map((id) => providers[id])
    .filter((p) => p && p.totalKeys > 0);
}

/** Get status of all providers */
export function getAllProviderStatuses(): ProviderStatus[] {
  return Object.values(providers).map((p) => p.getStatus());
}
