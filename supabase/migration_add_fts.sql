-- ═══════════════════════════════════════════════════════
-- Clarity — Migration: Add full-text search
-- Run this if you already have the tables created
-- ═══════════════════════════════════════════════════════

-- Add full-text search column to existing table
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON document_chunks USING gin(fts);

-- Full-text search function (primary retrieval)
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

-- Keyword fallback search
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
