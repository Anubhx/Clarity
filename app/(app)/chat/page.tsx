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
import { useSettingsStore } from "@/store/settings.store";
import Header from "@/components/layout/Header";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
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

/** Strip any residual markdown symbols the LLM emits despite server-side cleaning */
function sanitize(text: string): string {
  return text
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")  // **bold** → bold (cross-line)
    .replace(/\*([\s\S]*?)\*/g, "$1")       // *italic* → italic (cross-line)
    .replace(/_{2}([\s\S]*?)_{2}/g, "$1")  // __bold__ → bold
    .replace(/_([\s\S]*?)_/g, "$1")         // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, "")            // # headings → plain
    .replace(/^[-*+]\s+/gm, "")             // leading - * + bullets → removed
    .replace(/`([\s\S]*?)`/g, "$1")         // `code` → plain
    .replace(/\*+/g, "")                    // any leftover stray * chars
    .replace(/\n{3,}/g, "\n\n")             // collapse excess blank lines
    .trim();
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const raw = sanitize(message.content);

  // Split into paragraphs
  const paragraphs = raw.split(/\n{2,}/).filter(Boolean);

  return (
    <div className={`msg-row ${isUser ? "user" : ""}`}>
      <div className={`msg-avatar ${isUser ? "user" : "ai"}`}>
        {isUser ? "U" : "C"}
      </div>
      <div className={`msg-bubble ${isUser ? "user" : ""} ${message.is_streaming ? "streaming" : ""}`}>
        {isUser ? (
          <p>{raw}</p>
        ) : (
          paragraphs.map((para, i) => {
            // Detect numbered list block (lines starting with "1." "2." etc.)
            const lines = para.split("\n");
            const isNumberedList = lines.length > 1 && lines.every(l => /^\d+\.\s/.test(l.trim()));

            if (isNumberedList) {
              return (
                <ol key={i} style={{ paddingLeft: 18, margin: "6px 0" }}>
                  {lines.map((line, j) => (
                    <li key={j} style={{ marginBottom: 4, fontSize: 14, lineHeight: 1.6 }}>
                      {line.replace(/^\d+\.\s+/, "")}
                    </li>
                  ))}
                </ol>
              );
            }

            // Single line that looks like a numbered item
            if (/^\d+\.\s/.test(para.trim())) {
              return (
                <p key={i} style={{ margin: "4px 0" }}>
                  {para.replace(/^\d+\.\s+/, `${para.match(/^(\d+)\./)?.[1]}. `)}
                </p>
              );
            }

            return <p key={i} style={{ margin: "4px 0" }}>{para}</p>;
          })
        )}
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

      // Fetch suggested questions if enabled
      const { showSuggestedQuestions, activeProvider, byokKeys } = useSettingsStore.getState();
      if (showSuggestedQuestions) {
        const lastMsg = useChatStore.getState().messages.slice(-1)[0];
        if (lastMsg && lastMsg.role === "assistant") {
          fetch("/api/chat/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lastAnswer: lastMsg.content,
              provider: activeProvider,
              byokKey: byokKeys[activeProvider],
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.suggestions && data.suggestions.length > 0) {
                useChatStore.setState((state) => {
                  const msgs = [...state.messages];
                  if (msgs.length > 0) {
                    msgs[msgs.length - 1] = {
                      ...msgs[msgs.length - 1],
                      suggestions: data.suggestions,
                    };
                  }
                  return { messages: msgs };
                });
              }
            })
            .catch(console.error);
        }
      }
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
            messages.map((msg, idx) => (
              <div key={msg.id} style={{ width: "100%" }}>
                <MessageBubble message={msg} />
                {idx === messages.length - 1 &&
                  msg.role === "assistant" &&
                  msg.suggestions &&
                  msg.suggestions.length > 0 &&
                  !isStreaming && (
                    <div style={{ paddingLeft: 44, paddingBottom: 16 }}>
                      <SuggestedQuestions
                        suggestions={msg.suggestions}
                        onSelect={(q) => {
                          useChatStore.setState((state) => {
                            const msgs = [...state.messages];
                            msgs[idx] = { ...msgs[idx], suggestions: undefined };
                            return { messages: msgs };
                          });
                          handleSend(q);
                        }}
                      />
                    </div>
                  )}
              </div>
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
            <button
              className="chat-tool-btn"
              onClick={() => handleSend("Answer this question using all uploaded documents.")}
              disabled={isStreaming}
            >
              <FileText size={12} strokeWidth={2} /> All docs
            </button>
            <button
              className="chat-tool-btn"
              onClick={() => handleSend("Find all contradictions and conflicting statements across the selected documents. List each conflict with the source documents.")}
              disabled={isStreaming}
            >
              <AlertTriangle size={12} strokeWidth={2} /> Find contradictions
            </button>
            <button
              className="chat-tool-btn"
              onClick={() => handleSend("Identify missing information, weak sections, and unanswered questions in these documents. What gaps should be addressed?")}
              disabled={isStreaming}
            >
              <CircleDashed size={12} strokeWidth={2} /> Find gaps
            </button>
            <button
              className="chat-tool-btn"
              onClick={() => handleSend("Create a structured summary with key themes, decisions, stakeholders, and open questions across all uploaded documents.")}
              disabled={isStreaming}
            >
              <LayoutList size={12} strokeWidth={2} /> Summarise
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
