"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, ChevronDown, X, CheckSquare, Square } from "lucide-react";
import { useChatStore } from "@/store/chat.store";
import { useDocumentsStore } from "@/store/documents.store";

export function DocumentSelector() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeDocIds = useChatStore((s) => s.activeDocIds);
  const setActiveDocIds = useChatStore((s) => s.setActiveDocIds);
  const documents = useDocumentsStore((s) => s.documents);
  const readyDocs = documents.filter((d) => d.status === "ready");

  const selectedCount = activeDocIds.length;
  const allSelected = selectedCount === 0; // 0 = search all

  const toggle = (docId: string) => {
    if (activeDocIds.includes(docId)) {
      setActiveDocIds(activeDocIds.filter((id) => id !== docId));
    } else {
      setActiveDocIds([...activeDocIds, docId]);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (readyDocs.length === 0) return null;

  return (
    <div className="doc-selector-root" ref={dropdownRef}>
      {/* Trigger */}
      <button
        className={`doc-selector-trigger ${selectedCount > 0 ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FileText size={13} strokeWidth={2} />
        <span>{selectedCount > 0 ? `${selectedCount} of ${readyDocs.length} docs` : "All docs"}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          style={{
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Selected pills */}
      {selectedCount > 0 && (
        <div className="doc-selector-pills">
          {activeDocIds.map((id) => {
            const doc = readyDocs.find((d) => d.id === id);
            if (!doc) return null;
            return (
              <span key={id} className="doc-pill">
                <span className="doc-pill-name">{doc.name.replace(/\.[^.]+$/, "")}</span>
                <button
                  className="doc-pill-remove"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${doc.name}`}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="doc-selector-dropdown" role="listbox">
          {/* All docs option */}
          <div
            className={`doc-selector-item ${allSelected ? "checked" : ""}`}
            onClick={() => setActiveDocIds([])}
            role="option"
            aria-selected={allSelected}
          >
            <span className="doc-selector-check">
              {allSelected ? (
                <CheckSquare size={14} strokeWidth={2} style={{ color: "var(--color-blue)" }} />
              ) : (
                <Square size={14} strokeWidth={2} style={{ color: "var(--color-ink-tertiary)" }} />
              )}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-ink)" }}>
              All documents
            </span>
            <span className="tag tag-muted" style={{ marginLeft: "auto", fontSize: 11 }}>
              {readyDocs.length} total
            </span>
          </div>

          <div className="doc-selector-divider" />

          {/* Individual docs */}
          <div className="doc-selector-list">
            {readyDocs.map((doc) => {
              const isChecked = activeDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`doc-selector-item ${isChecked ? "checked" : ""}`}
                  onClick={() => toggle(doc.id)}
                  role="option"
                  aria-selected={isChecked}
                >
                  <span className="doc-selector-check">
                    {isChecked ? (
                      <CheckSquare size={14} strokeWidth={2} style={{ color: "var(--color-blue)" }} />
                    ) : (
                      <Square size={14} strokeWidth={2} style={{ color: "var(--color-ink-tertiary)" }} />
                    )}
                  </span>
                  <FileText size={13} strokeWidth={1.75} style={{ color: "var(--color-ink-tertiary)", flexShrink: 0 }} />
                  <span className="doc-selector-name">{doc.name}</span>
                  <span className="tag tag-muted" style={{ fontSize: 10, flexShrink: 0 }}>
                    {(doc.type || "doc").toUpperCase().slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {selectedCount > 0 && (
            <div className="doc-selector-footer">
              <button
                className="doc-selector-clear"
                onClick={() => {
                  setActiveDocIds([]);
                  setOpen(false);
                }}
              >
                Clear selection — search all docs
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
