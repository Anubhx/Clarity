/**
 * Document Chunker
 * Splits documents into overlapping chunks based on doc type
 */

import { v4 as uuidv4 } from "uuid";
import { CHUNK_SIZES } from "@/config/constants";
import type { DocType, DocumentChunk } from "@/types/document.types";

interface ChunkOptions {
  docId: string;
  docName: string;
  docType: DocType;
  content: string;
}

/** Estimate token count (rough: 1 token ≈ 4 chars) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Split text into chunks with overlap */
export function chunkDocument(options: ChunkOptions): DocumentChunk[] {
  const { docId, docName, docType, content } = options;
  const config = (docType in CHUNK_SIZES ? CHUNK_SIZES[docType as keyof typeof CHUNK_SIZES] : CHUNK_SIZES.default);
  const chunkSizeChars = config.size * 4; // convert token estimate to chars
  const overlapChars = config.overlap * 4;

  const chunks: DocumentChunk[] = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + chunkSizeChars, content.length);

    // Try to break at a sentence or paragraph boundary
    if (end < content.length) {
      const lastParagraph = content.lastIndexOf("\n\n", end);
      const lastSentence = content.lastIndexOf(". ", end);
      const lastNewline = content.lastIndexOf("\n", end);

      if (lastParagraph > start + chunkSizeChars * 0.5) {
        end = lastParagraph + 2;
      } else if (lastSentence > start + chunkSizeChars * 0.5) {
        end = lastSentence + 2;
      } else if (lastNewline > start + chunkSizeChars * 0.5) {
        end = lastNewline + 1;
      }
    }

    const chunkContent = content.slice(start, end).trim();

    if (chunkContent.length > 0) {
      // Try to extract section header
      const sectionMatch = chunkContent.match(/^#+\s+(.+)/m);

      chunks.push({
        chunk_id: uuidv4(),
        doc_id: docId,
        doc_name: docName,
        doc_type: docType,
        content: chunkContent,
        section: sectionMatch?.[1],
        char_start: start,
        char_end: end,
        token_count: estimateTokens(chunkContent),
        created_at: new Date().toISOString(),
      });
    }

    start = end - overlapChars;
    if (start >= content.length) break;
    if (end >= content.length) break;
  }

  return chunks;
}
