/**
 * RetrievalAgent — Core RAG agent
 * Handles search, context assembly, and grounded answer generation
 */

import { callLLM } from "@/lib/llm";
import { searchDocuments } from "@/lib/vector-store";
import type { Citation, Message } from "@/types/chat.types";
import type { DocumentChunk } from "@/types/document.types";

interface RetrievalResult {
  answer: string;
  citations: Citation[];
  confidence: number;
  sources_used: string[];
}

const SYSTEM_PROMPT = `You are Clarity, a design research assistant. You answer questions ONLY using the document context provided below.

CRITICAL RULES:
1. Answer ONLY from the provided context. Never use outside knowledge.
2. If the context does not contain the answer, say "I could not find this in the uploaded documents."
3. Every factual claim must reference a source.
4. Be specific — quote or paraphrase the relevant text.
5. When you find contradictions between documents, highlight them.
6. Dont have ( #,+,-,* ) any special characters in the answer.

After your answer, add citations in this EXACT format:
---CITATIONS---
[{"claim":"the specific claim","doc_name":"document name","section":"section if known","excerpt":"exact quote from the source"}]
---END_CITATIONS---`;

function buildContextPrompt(
  chunks: (DocumentChunk & { similarity: number })[]
): string {
  return chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: "${c.doc_name}"${c.section ? ` — §${c.section}` : ""}]\n${c.content}`
    )
    .join("\n\n---\n\n");
}

function extractCitations(
  response: string
): { answer: string; citations: Citation[] } {
  const citationMatch = response.match(
    /---CITATIONS---\s*([\s\S]*?)\s*---END_CITATIONS---/
  );
  let citations: Citation[] = [];
  let answer = response;

  if (citationMatch) {
    answer = response.slice(0, response.indexOf("---CITATIONS---")).trim();
    try {
      const parsed = JSON.parse(citationMatch[1]);
      citations = Array.isArray(parsed)
        ? parsed.map((c: Record<string, string>) => ({
            claim: c.claim || "",
            doc_name: c.doc_name || "",
            chunk_id: c.chunk_id || "",
            section: c.section,
            excerpt: (c.excerpt || "").slice(0, 200),
          }))
        : [];
    } catch {
      // If citation parsing fails, still return the answer
      citations = [];
    }
  }

  return { answer, citations };
}

export async function retrievalAgent(
  query: string,
  conversationHistory: Message[],
  docIds?: string[]
): Promise<RetrievalResult> {
  console.log(`[RetrievalAgent] Query: "${query}", docIds:`, docIds);

  // Step 1: Search documents using full-text search
  const chunks = await searchDocuments(query, 8, docIds);
  console.log(`[RetrievalAgent] Found ${chunks.length} chunks`);

  if (chunks.length === 0) {
    return {
      answer:
        "I could not find relevant information in the uploaded documents. Try uploading more documents or rephrasing your question.",
      citations: [],
      confidence: 0,
      sources_used: [],
    };
  }

  // Step 2: Build context from retrieved chunks
  const context = buildContextPrompt(chunks);
  console.log(
    `[RetrievalAgent] Context length: ${context.length} chars from ${chunks.length} chunks`
  );

  // Step 3: Build messages
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [{ role: "system", content: SYSTEM_PROMPT }];

  // Add recent conversation history (last 4 messages)
  if (conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-4);
    for (const m of recent) {
      messages.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
    }
  }

  // Add the current query with context
  messages.push({
    role: "user",
    content: `DOCUMENT CONTEXT:\n${context}\n\n---\n\nUSER QUESTION: ${query}`,
  });

  // Step 4: Call DeepSeek
  const response = await callLLM(messages, {
    temperature: 0.3,
    max_tokens: 2048,
  });
  console.log(`[RetrievalAgent] DeepSeek response length: ${response.length}`);

  // Step 5: Extract answer + citations
  const { answer, citations } = extractCitations(response);

  // Step 6: Unique sources
  const sourcesUsed = [...new Set(chunks.map((c) => c.doc_name))];

  return {
    answer,
    citations,
    confidence: chunks[0]?.similarity || 0.5,
    sources_used: sourcesUsed,
  };
}
