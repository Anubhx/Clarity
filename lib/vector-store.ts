/**
 * Vector Store — Supabase search operations
 * Uses direct Supabase queries (no RPC functions needed)
 * Full-text search via textSearch(), with ILIKE keyword fallback
 */

import { getServerSupabase } from "./supabase";
import { generateEmbedding } from "./embeddings";
import type { DocumentChunk } from "@/types/document.types";

/** Upsert a chunk into the store */
export async function upsertChunk(chunk: DocumentChunk): Promise<void> {
  const supabase = getServerSupabase();

  const { error } = await supabase.from("document_chunks").upsert({
    id: chunk.chunk_id,
    doc_id: chunk.doc_id,
    doc_name: chunk.doc_name,
    doc_type: chunk.doc_type,
    content: chunk.content,
    page: chunk.page,
    section: chunk.section,
    char_start: chunk.char_start,
    char_end: chunk.char_end,
    token_count: chunk.token_count,
    embedding: chunk.embedding,
    created_at: chunk.created_at,
  });

  if (error) throw new Error(`Failed to upsert chunk: ${error.message}`);
}

/** Batch upsert chunks */
export async function upsertChunks(chunks: DocumentChunk[]): Promise<void> {
  const supabase = getServerSupabase();

  // Batch insert in groups of 50
  for (let i = 0; i < chunks.length; i += 50) {
    const batch = chunks.slice(i, i + 50).map((chunk) => ({
      id: chunk.chunk_id,
      doc_id: chunk.doc_id,
      doc_name: chunk.doc_name,
      doc_type: chunk.doc_type,
      content: chunk.content,
      page: chunk.page,
      section: chunk.section,
      char_start: chunk.char_start,
      char_end: chunk.char_end,
      token_count: chunk.token_count,
      embedding: chunk.embedding,
      created_at: chunk.created_at,
    }));

    const { error } = await supabase.from("document_chunks").upsert(batch);
    if (error) throw new Error(`Failed to upsert batch: ${error.message}`);
  }
}

/** Search documents — tries multiple strategies until results are found */
export async function searchDocuments(
  query: string,
  topK: number = 8,
  docIds?: string[]
): Promise<(DocumentChunk & { similarity: number })[]> {
  const supabase = getServerSupabase();

  // Strategy 1: Vector similarity search using Gemini embeddings (Primary)
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: topK,
      filter_doc_ids: docIds?.length ? docIds : null,
    });

    if (!error && data && data.length > 0) {
      console.log(`[VectorStore] Vector search found ${data.length} chunks`);
      return mapRows(data);
    } else if (error) {
      console.warn(`[VectorStore] Vector search error: ${error.message}`);
    }
  } catch (e) {
    console.log("[VectorStore] Vector search failed, falling back to FTS...", e);
  }

  // Strategy 2: Full-text search using Supabase textSearch (Fallback)
  try {
    // Convert query to tsquery-compatible format
    const tsQuery = query
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .join(" | "); // OR search for broader matching

    let q = supabase
      .from("document_chunks")
      .select("*")
      .textSearch("content", tsQuery, { type: "websearch", config: "english" })
      .limit(topK);

    if (docIds && docIds.length > 0) {
      q = q.in("doc_id", docIds);
    }

    const { data, error } = await q;

    if (!error && data && data.length > 0) {
      console.log(`[VectorStore] FTS found ${data.length} chunks`);
      return mapRows(data);
    }
  } catch (e) {
    console.log("[VectorStore] FTS failed, trying keyword search...", e);
  }

  // Strategy 2: Keyword search (ILIKE) on individual words
  try {
    const keywords = query
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5); // top 5 keywords

    for (const keyword of keywords) {
      let q = supabase
        .from("document_chunks")
        .select("*")
        .ilike("content", `%${keyword}%`)
        .limit(topK);

      if (docIds && docIds.length > 0) {
        q = q.in("doc_id", docIds);
      }

      const { data, error } = await q;

      if (!error && data && data.length > 0) {
        console.log(
          `[VectorStore] Keyword "${keyword}" found ${data.length} chunks`
        );
        return mapRows(data);
      }
    }
  } catch (e) {
    console.log("[VectorStore] Keyword search failed...", e);
  }

  // Strategy 3: Just fetch all chunks for the given documents
  if (docIds && docIds.length > 0) {
    console.log("[VectorStore] Falling back to all chunks for documents");
    const { data, error } = await supabase
      .from("document_chunks")
      .select("*")
      .in("doc_id", docIds)
      .order("char_start", { ascending: true })
      .limit(topK);

    if (!error && data && data.length > 0) {
      console.log(`[VectorStore] Fetched ${data.length} chunks (all docs)`);
      return mapRows(data);
    }
  }

  console.log("[VectorStore] No chunks found at all");
  return [];
}

/** Legacy alias */
export const similaritySearch = searchDocuments;

function mapRows(
  data: Record<string, unknown>[]
): (DocumentChunk & { similarity: number })[] {
  return data.map((row) => ({
    chunk_id: row.id as string,
    doc_id: row.doc_id as string,
    doc_name: row.doc_name as string,
    doc_type: row.doc_type as DocumentChunk["doc_type"],
    content: row.content as string,
    page: row.page as number | undefined,
    section: row.section as string | undefined,
    char_start: row.char_start as number,
    char_end: row.char_end as number,
    token_count: row.token_count as number,
    created_at: row.created_at as string,
    similarity: (row.similarity as number) ?? (row.rank ? (row.rank as number) : 0.8),
  }));
}

/** Delete all chunks for a document */
export async function deleteDocumentChunks(docId: string): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("document_chunks")
    .delete()
    .eq("doc_id", docId);
  if (error) throw new Error(`Failed to delete chunks: ${error.message}`);
}

/** Get all chunks for a document */
export async function getDocumentChunks(
  docId: string
): Promise<DocumentChunk[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("document_chunks")
    .select("*")
    .eq("doc_id", docId)
    .order("char_start", { ascending: true });

  if (error) throw new Error(`Failed to get chunks: ${error.message}`);

  return (data || []).map((row: Record<string, unknown>) => ({
    chunk_id: row.id as string,
    doc_id: row.doc_id as string,
    doc_name: row.doc_name as string,
    doc_type: row.doc_type as DocumentChunk["doc_type"],
    content: row.content as string,
    page: row.page as number | undefined,
    section: row.section as string | undefined,
    char_start: row.char_start as number,
    char_end: row.char_end as number,
    token_count: row.token_count as number,
    created_at: row.created_at as string,
  }));
}
