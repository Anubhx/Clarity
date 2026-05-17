"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowUp,
  FileText,
  AlertTriangle,
  CircleDashed,
  LayoutList,
  Sparkles,
  Loader2,
  Bookmark,
  CheckCircle,
} from "lucide-react";
import { useChatStore } from "@/store/chat.store";
import { useDocumentsStore } from "@/store/documents.store";
import Header from "@/components/layout/Header";
import type { Message, Citation } from "@/types/chat.types";

function CitationTag({ citation }: { citation: Citation }) {
  return (
    <span className="tag tag-amber">
      <Bookmark size={10} strokeWidth={2} />
      {citation.doc_name}
      {citation.section ? ` §${citation.section}` : ""}
    </span>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`msg-row ${isUser ? "user" : ""}`}>
      <div className={`msg-avatar ${isUser ? "user" : "ai"}`}>
        {isUser ? "U" : "C"}
      </div>
      <div className={`msg-bubble ${isUser ? "user" : ""} ${message.is_streaming ? "streaming" : ""}`}>
        {message.content.split("\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        {message.citations && message.citations.length > 0 && (
          <div className="citation-row">
            {message.citations.map((c, i) => (
              <CitationTag key={i} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  { text: "What are the key pain points in the onboarding experience?", icon: Sparkles },
  { text: "Show all contradictions across documents", icon: AlertTriangle },
  { text: "What's missing from the PRD?", icon: CircleDashed },
];

export default function ChatPage() {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isStreaming,
    agentStatus,
    addMessage,
    updateLastMessage,
    setStreaming,
    setAgentStatus,
  } = useChatStore();

  const documents = useDocumentsStore((s) => s.documents);
  const readyDocs = documents.filter((d) => d.status === "ready");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isStreaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Add placeholder assistant message
    const assistantMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "",
      is_streaming: true,
      created_at: new Date().toISOString(),
    };
    addMessage(assistantMessage);

    setStreaming(true);
    setAgentStatus({
      state: "tool_executing",
      agent: "retrieval",
      message: "Searching your documents…",
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_history: messages.filter((m) => !m.is_streaming),
          document_ids: readyDocs.map((d) => d.id),
        }),
      });

      const data = await response.json();

      // Update the assistant message with the response
      useChatStore.setState((state) => {
        const msgs = [...state.messages];
        if (msgs.length > 0) {
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: data.answer || data.error || "No response received",
            citations: data.citations || [],
            confidence: data.confidence || 0,
            sources_used: data.sources_used || [],
            is_streaming: false,
          };
        }
        return { messages: msgs };
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Network error";
      updateLastMessage(`⚠️ ${errMsg}`);
      setAgentStatus({
        state: "error",
        agent: "retrieval",
        message: errMsg,
      });
    } finally {
      setStreaming(false);
      setAgentStatus({ state: "done", agent: "", message: "" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const showEmptyState = messages.length === 0;

  return (
    <>
      <Header
        title="Chat"
        badge={
          readyDocs.length > 0 ? (
            <span className="tag tag-green">
              <CheckCircle size={10} strokeWidth={2} />
              {readyDocs.length} doc{readyDocs.length > 1 ? "s" : ""} active
            </span>
          ) : undefined
        }
      >
        {messages.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => useChatStore.getState().clearMessages()}
          >
            Clear chat
          </button>
        )}
      </Header>

      <div className="chat-wrap">
        <div className="chat-messages">
          {showEmptyState ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Sparkles size={28} strokeWidth={1.5} />
              </div>
              <h2>Ask anything about your documents</h2>
              <p>
                Upload PRDs, research notes, competitive analyses or connect
                Google Drive to start asking questions with cited answers.
              </p>
              <div className="empty-features">
                <div className="empty-feature">
                  <Bookmark
                    size={24}
                    strokeWidth={1.75}
                    style={{ color: "var(--color-blue)" }}
                  />
                  <div className="empty-feature-title">Cited answers</div>
                  <div className="empty-feature-desc">
                    Every answer links to the exact source
                  </div>
                </div>
                <div className="empty-feature">
                  <AlertTriangle
                    size={24}
                    strokeWidth={1.75}
                    style={{ color: "var(--color-coral)" }}
                  />
                  <div className="empty-feature-title">Contradiction finder</div>
                  <div className="empty-feature-desc">
                    Spot conflicts across all your docs
                  </div>
                </div>
                <div className="empty-feature">
                  <CircleDashed
                    size={24}
                    strokeWidth={1.75}
                    style={{ color: "var(--color-amber-dark)" }}
                  />
                  <div className="empty-feature-title">Gap finder</div>
                  <div className="empty-feature-desc">
                    Find what&rsquo;s missing before it matters
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Agent Status Bar */}
        {isStreaming && agentStatus.state === "tool_executing" && (
          <div className="agent-bar">
            <Loader2 size={14} className="animate-spin" />
            {agentStatus.message}
          </div>
        )}

        {/* Suggested Questions */}
        {showEmptyState && (
          <div className="suggested-qs">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                className="sq-btn"
                onClick={() => handleSend(q.text)}
              >
                <q.icon size={13} strokeWidth={2} />
                {q.text}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input */}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Ask anything about your documents…"
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
            >
              <ArrowUp size={14} strokeWidth={2.5} color="#fff" />
            </button>
          </div>
          <div className="chat-tools">
            <button className="chat-tool-btn">
              <FileText size={12} strokeWidth={2} /> All docs
            </button>
            <button className="chat-tool-btn">
              <AlertTriangle size={12} strokeWidth={2} /> Find contradictions
            </button>
            <button className="chat-tool-btn">
              <CircleDashed size={12} strokeWidth={2} /> Find gaps
            </button>
            <button className="chat-tool-btn">
              <LayoutList size={12} strokeWidth={2} /> Summarise
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
