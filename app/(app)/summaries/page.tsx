"use client";

import { useState, useEffect } from "react";
import {
  LayoutList,
  RefreshCw,
  Sparkles,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import DocHealthCard, {
  DocHealthCardSkeleton,
  type HealthData,
} from "@/components/documents/DocHealthCard";
import { useDocumentsStore } from "@/store/documents.store";
import type { DocumentRecord } from "@/types/document.types";

/* ── Document selector dropdown (rendered in header right slot) */

function DocSelector({
  docs,
  selectedId,
  onSelect,
}: {
  docs: DocumentRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = docs.find((d) => d.id === selectedId);

  return (
    <div
      style={{ position: "relative" }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setTimeout(() => setOpen(false), 100);
        }
      }}
    >
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen((o) => !o)}
        style={{ gap: 8, maxWidth: 260 }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}
        >
          {selected ? selected.name : "Select document…"}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          style={{
            flexShrink: 0,
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 280,
            background: "var(--color-white)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--r-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.09)",
            zIndex: 50,
            overflow: "hidden",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {docs.map((doc) => (
            <button
              key={doc.id}
              tabIndex={0}
              onClick={() => {
                onSelect(doc.id);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                background: doc.id === selectedId ? "var(--color-blue-light)" : "none",
                border: "none",
                textAlign: "left",
                fontSize: 13,
                color: doc.id === selectedId ? "var(--color-blue)" : "var(--color-ink)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.name}
              </span>
              <span className="tag tag-muted" style={{ fontSize: 10, flexShrink: 0 }}>
                {doc.type?.toUpperCase().slice(0, 3) || "DOC"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function SummariesPage() {
  const documents = useDocumentsStore((s) => s.documents);
  const updateDocument = useDocumentsStore((s) => s.updateDocument);

  const readyDocs = documents.filter((d) => d.status === "ready");

  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);

  // Auto-select first ready doc
  useEffect(() => {
    if (readyDocs.length > 0 && !selectedId) {
      setSelectedId(readyDocs[0].id);
    }
  }, [readyDocs, selectedId]);

  // Auto-analyze when selection changes
  useEffect(() => {
    if (!selectedId) {
      setHealthData(null);
      return;
    }
    const doc = documents.find((d) => d.id === selectedId) as
      | (DocumentRecord & { health_data?: HealthData })
      | undefined;

    if (doc?.health_data) {
      setHealthData(doc.health_data);
      return;
    }
    analyze(selectedId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const analyze = async (docId: string, forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    setHealthData(null);

    try {
      const res = await fetch("/api/summaries/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, force_refresh: forceRefresh }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setHealthData(data.health_data as HealthData);
      updateDocument(docId, { health_data: data.health_data } as Partial<DocumentRecord>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedId);

  /* ── Empty state ────────────────────────────────────────── */
  if (readyDocs.length === 0) {
    return (
      <>
        <Header title="Summaries" />
        <div className="content">
          <div className="empty-state">
            <div className="empty-icon">
              <LayoutList size={28} strokeWidth={1.5} />
            </div>
            <h2>No documents to analyze</h2>
            <p>Upload documents first to see health scores</p>
            <div style={{ marginTop: 24 }}>
              <Link href="/documents" className="btn btn-primary">
                <Sparkles size={14} strokeWidth={2} />
                Upload documents
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Main view ──────────────────────────────────────────── */
  return (
    <>
      <Header title="Summaries">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {healthData && !loading && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => analyze(selectedId, true)}
              title="Re-analyse"
            >
              <RefreshCw size={13} strokeWidth={2} />
              Re-analyse
            </button>
          )}
          <DocSelector
            docs={readyDocs}
            selectedId={selectedId}
            onSelect={(id) => {
              if (id !== selectedId) {
                setSelectedId(id);
                setHealthData(null);
              }
            }}
          />
        </div>
      </Header>

      <div className="content">
        {/* Loading */}
        {loading && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                marginBottom: 20,
                background: "var(--color-blue-light)",
                border: "1px solid #C5D9FB",
                borderRadius: "var(--r-md)",
                fontSize: 13,
                color: "var(--color-blue)",
              }}
            >
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              Analysing document — this may take a few seconds…
            </div>
            <DocHealthCardSkeleton />
          </>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--r-md)",
              background: "var(--color-coral-light)",
              border: "1px solid var(--color-coral)",
              color: "var(--color-coral-dark)",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontWeight: 500 }}>Analysis failed:</span> {error}
          </div>
        )}

        {/* Results */}
        {healthData && !loading && selectedDoc && (
          <DocHealthCard document={selectedDoc} healthData={healthData} />
        )}
      </div>
    </>
  );
}
