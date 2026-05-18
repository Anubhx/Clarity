-- Migration: add health_data column to documents table
-- Run this in the Supabase SQL editor or via the CLI

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS health_data JSONB DEFAULT NULL;

-- Optional index for querying cached vs. uncached docs
CREATE INDEX IF NOT EXISTS idx_documents_health_data_not_null
  ON documents ((health_data IS NOT NULL));
