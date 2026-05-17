-- ═══════════════════════════════════════════════════════
-- Clarity — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'uploading',
  file_size INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Document chunks table with vector embeddings + full-text search
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  doc_name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  content TEXT NOT NULL,
  page INTEGER,
  section TEXT,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector(1536),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON document_chunks USING gin(fts);

-- Step 5: Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Step 6: Vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 8,
  filter_doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  doc_name TEXT,
  doc_type TEXT,
  content TEXT,
  page INTEGER,
  section TEXT,
  char_start INTEGER,
  char_end INTEGER,
  token_count INTEGER,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.doc_id,
    dc.doc_name,
    dc.doc_type,
    dc.content,
    dc.page,
    dc.section,
    dc.char_start,
    dc.char_end,
    dc.token_count,
    dc.created_at,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE
    1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_doc_ids IS NULL OR dc.doc_id = ANY(filter_doc_ids))
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 7: Full-text search function (primary retrieval method)
CREATE OR REPLACE FUNCTION search_documents(
  search_query TEXT,
  match_count INT DEFAULT 8,
  filter_doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  doc_name TEXT,
  doc_type TEXT,
  content TEXT,
  page INTEGER,
  section TEXT,
  char_start INTEGER,
  char_end INTEGER,
  token_count INTEGER,
  created_at TIMESTAMPTZ,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.doc_id,
    dc.doc_name,
    dc.doc_type,
    dc.content,
    dc.page,
    dc.section,
    dc.char_start,
    dc.char_end,
    dc.token_count,
    dc.created_at,
    ts_rank_cd(dc.fts, websearch_to_tsquery('english', search_query))::FLOAT AS rank
  FROM document_chunks dc
  WHERE
    dc.fts @@ websearch_to_tsquery('english', search_query)
    AND (filter_doc_ids IS NULL OR dc.doc_id = ANY(filter_doc_ids))
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Step 8: Keyword fallback search (when full-text returns nothing)
CREATE OR REPLACE FUNCTION keyword_search_documents(
  search_query TEXT,
  match_count INT DEFAULT 8,
  filter_doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  doc_name TEXT,
  doc_type TEXT,
  content TEXT,
  page INTEGER,
  section TEXT,
  char_start INTEGER,
  char_end INTEGER,
  token_count INTEGER,
  created_at TIMESTAMPTZ,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.doc_id,
    dc.doc_name,
    dc.doc_type,
    dc.content,
    dc.page,
    dc.section,
    dc.char_start,
    dc.char_end,
    dc.token_count,
    dc.created_at,
    1.0::FLOAT AS rank
  FROM document_chunks dc
  WHERE
    dc.content ILIKE '%' || search_query || '%'
    AND (filter_doc_ids IS NULL OR dc.doc_id = ANY(filter_doc_ids))
  ORDER BY dc.char_start ASC
  LIMIT match_count;
END;
$$;

-- Step 9: Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own documents
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read all chunks"
  ON document_chunks FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage chunks"
  ON document_chunks FOR ALL
  USING (true)
  WITH CHECK (true);
