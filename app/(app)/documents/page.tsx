"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useDropzone } from "react-dropzone";
import {
  Plus,
  Search,
  UploadCloud,
  FileText,
  CheckCircle,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useDocumentsStore } from "@/store/documents.store";
import { cn, formatRelativeTime, formatNumber } from "@/lib/utils";
import type { DocType } from "@/types/document.types";

export default function DocumentsPage() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    documents,
    isUploading,
    uploadProgress,
    setDocuments,
    addDocument,
    setUploading,
    setUploadProgress,
    updateDocument,
  } = useDocumentsStore();

  // Fetch documents on mount
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/documents?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents || []))
      .catch(console.error);
  }, [user?.id, setDocuments]);

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      useDocumentsStore.getState().removeDocument(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user?.id) return;
      setUploading(true);

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", detectDocType(file.name));
        formData.append("userId", user.id);

        // Add placeholder doc
        const tempId = `temp-${Date.now()}`;
        addDocument({
          id: tempId,
          name: file.name,
          type: detectDocType(file.name) as DocType,
          status: "uploading",
          file_size: file.size,
          word_count: 0,
          chunk_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user.id,
        });

        try {
          setUploadProgress(tempId, 30);
          const res = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });

          setUploadProgress(tempId, 80);

          if (!res.ok) {
            const rawText = await res.text();
            console.error("Raw server error response:", rawText.slice(0, 500));
            
            let errorData: any = {};
            try { errorData = JSON.parse(rawText); } catch (e) {}
            
            throw new Error(`Upload failed: ${errorData.error || rawText.slice(0, 60)}`);
          }
          const data = await res.json();

          setUploadProgress(tempId, 100);
          updateDocument(tempId, {
            id: data.doc_id,
            status: "ready",
            chunk_count: data.chunk_count,
            word_count: data.word_count,
          });
        } catch (err) {
          console.error("Upload error:", err);
          updateDocument(tempId, { status: "error" });
        }
      }

      setUploading(false);
      setShowUpload(false);
    },
    [user?.id, addDocument, setUploading, setUploadProgress, updateDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const filteredDocs = searchQuery
    ? documents.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  const readyCount = documents.filter((d) => d.status === "ready").length;

  return (
    <>
      <Header
        title="Documents"
        badge={
          readyCount > 0 ? (
            <span className="tag tag-muted">{readyCount} indexed</span>
          ) : undefined
        }
      >
        <div className="input-wrap" style={{ width: 220 }}>
          <Search
            size={15}
            strokeWidth={2}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink-tertiary)",
            }}
          />
          <input
            className="input has-icon"
            placeholder="Search documents…"
            style={{ height: 32, fontSize: 13 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Plus size={14} strokeWidth={2} /> Add document
        </button>
      </Header>

      <div className="content">
        {/* Upload Zone */}
        {showUpload && (
          <div
            {...getRootProps()}
            className={cn("drop-zone", isDragActive && "drag-active")}
            style={{ marginBottom: 24 }}
          >
            <input {...getInputProps()} />
            <div className="drop-icon">
              <UploadCloud size={24} strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
              {isDragActive ? "Drop files here" : "Drop files here to upload"}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-ink-tertiary)", marginBottom: 16 }}>
              PDF, DOCX, TXT, Markdown supported · Max 50MB per file
            </div>
            <button className="btn btn-secondary">Browse files</button>
          </div>
        )}

        {/* Pipeline info card */}
        {isUploading && (
          <div
            className="card"
            style={{
              background: "var(--color-blue-light)",
              borderColor: "#C5D9FB",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Sparkles
                size={16}
                strokeWidth={2}
                style={{ color: "var(--color-blue)", marginTop: 1, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-blue)", marginBottom: 3 }}>
                  Pipeline: Parse → Chunk → Embed → Store
                </div>
                <div style={{ fontSize: 12, color: "var(--color-blue-dark)", opacity: 0.8 }}>
                  Each document is split into 512-token chunks, embedded with DeepSeek, and stored in your vector database.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Grid */}
        {filteredDocs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="doc-card">
                <div className="doc-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className={cn("doc-icon", doc.type === "research" && "amber", doc.type === "competitive" && "coral")}>
                      <FileText size={18} strokeWidth={1.75} />
                    </div>
                    {doc.status === "ready" ? (
                      <span className="tag tag-green">
                        <CheckCircle size={10} strokeWidth={2} /> Ready
                      </span>
                    ) : doc.status === "error" ? (
                      <span className="tag tag-coral">Error</span>
                    ) : (
                      <span className="tag tag-amber">
                        <Loader2 size={10} strokeWidth={2} className="animate-spin" /> Indexing
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 4, height: 26, color: "var(--color-coral)" }}
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    disabled={deletingId === doc.id}
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    {doc.name}
                  </div>
                  <div className="doc-meta">
                    <span className={cn("status-dot", doc.status === "ready" ? "green" : "amber")} />
                    {doc.chunk_count} chunks · {formatNumber(doc.word_count)} words
                  </div>
                </div>
                <div className="doc-meta" style={{ justifyContent: "space-between" }}>
                  <span className="tag tag-muted">{doc.type || "Document"}</span>
                  <span style={{ fontSize: 12, color: "var(--color-ink-tertiary)" }}>
                    {formatRelativeTime(doc.created_at)}
                  </span>
                </div>

                {/* Upload progress */}
                {uploadProgress[doc.id] !== undefined && uploadProgress[doc.id] < 100 && (
                  <div className="doc-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress[doc.id]}%` }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-tertiary)", marginTop: 4 }}>
                      {uploadProgress[doc.id]}% — processing…
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add document card */}
            <div
              className="doc-card add-doc-card"
              onClick={() => setShowUpload(true)}
              style={{
                border: "1.5px dashed var(--color-border)",
                background: "var(--color-surface)",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 160,
                cursor: "pointer",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div className="add-icon-wrap">
                  <Plus size={16} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-ink-secondary)" }}>
                  Add document
                </div>
                <div style={{ fontSize: 12, color: "var(--color-ink-tertiary)", marginTop: 3 }}>
                  PDF, DOCX, MD or Drive
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={28} strokeWidth={1.5} />
            </div>
            <h2>No documents yet</h2>
            <p>
              Upload your PRDs, research notes, competitive analyses to start asking questions.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <UploadCloud size={14} strokeWidth={2} /> Upload documents
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function detectDocType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("prd")) return "prd";
  if (lower.includes("research")) return "research";
  if (lower.includes("compet")) return "competitive";
  if (lower.includes("brief")) return "brief";
  if (lower.includes("problem")) return "problem_statement";
  return "other";
}
