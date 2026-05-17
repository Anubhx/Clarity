/**
 * Settings Store — Zustand
 * Manages user preferences and BYOK API keys
 * Keys are stored in session storage only (never persisted to server)
 */

import { create } from "zustand";

export type AIProvider = "built-in" | "openai" | "anthropic" | "gemini" | "deepseek";

interface SettingsState {
  // AI Provider
  activeProvider: AIProvider;
  byokKeys: Record<string, string>;
  model: string;
  maxChunks: number;

  // Behaviour
  autoDetectContradictions: boolean;
  showSuggestedQuestions: boolean;

  // Appearance
  theme: "light" | "dark" | "system";

  // Actions
  setProvider: (provider: AIProvider) => void;
  setByokKey: (provider: string, key: string) => void;
  removeByokKey: (provider: string) => void;
  setModel: (model: string) => void;
  setMaxChunks: (n: number) => void;
  setAutoDetectContradictions: (v: boolean) => void;
  setShowSuggestedQuestions: (v: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeProvider: "built-in",
  byokKeys: {},
  model: "deepseek-chat",
  maxChunks: 8,
  autoDetectContradictions: true,
  showSuggestedQuestions: true,
  theme: "light",

  setProvider: (activeProvider) => set({ activeProvider }),

  setByokKey: (provider, key) =>
    set((state) => ({
      byokKeys: { ...state.byokKeys, [provider]: key },
    })),

  removeByokKey: (provider) =>
    set((state) => {
      const keys = { ...state.byokKeys };
      delete keys[provider];
      return { byokKeys: keys };
    }),

  setModel: (model) => set({ model }),
  setMaxChunks: (maxChunks) => set({ maxChunks }),
  setAutoDetectContradictions: (autoDetectContradictions) =>
    set({ autoDetectContradictions }),
  setShowSuggestedQuestions: (showSuggestedQuestions) =>
    set({ showSuggestedQuestions }),
  setTheme: (theme) => set({ theme }),
}));
