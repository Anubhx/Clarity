/**
 * Chat Store — Zustand
 */

import { create } from "zustand";
import type { Message, SuggestedQuestion } from "@/types/chat.types";
import type { AgentStatus } from "@/types/agent.types";

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  agentStatus: AgentStatus;
  suggestedQuestions: SuggestedQuestion[];
  activeDocIds: string[];
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setAgentStatus: (status: AgentStatus) => void;
  setSuggestedQuestions: (questions: SuggestedQuestion[]) => void;
  setActiveDocIds: (ids: string[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  agentStatus: { state: "idle", agent: "", message: "" },
  suggestedQuestions: [],
  activeDocIds: [],

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      }
      return { messages: msgs };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setAgentStatus: (agentStatus) => set({ agentStatus }),

  setSuggestedQuestions: (suggestedQuestions) => set({ suggestedQuestions }),

  setActiveDocIds: (activeDocIds) => set({ activeDocIds }),

  clearMessages: () =>
    set({
      messages: [],
      suggestedQuestions: [],
      agentStatus: { state: "idle", agent: "", message: "" },
    }),
}));
