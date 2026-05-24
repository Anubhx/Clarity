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

const SYSTEM_PROMPT = `You are Clarity, a design research assistant. You answer questions ONLY using the document context provided.

CRITICAL OUTPUT RULES — VIOLATION = INVALID RESPONSE:
1. Answer ONLY from the provided document context. Never use outside knowledge.
2. If the context does not contain the answer, say: I could not find this in the uploaded documents.
3. Every factual claim must reference a source by name.
4. Be specific — quote or paraphrase the relevant text.
5. When you find contradictions between documents, highlight them clearly.
6. ABSOLUTE PROHIBITION: Do NOT use ** for bold, * for italics, # for headings, _ for underscores, - as bullet points, or any other markdown syntax.
7. Write in plain prose paragraphs. If listing items, use numbers: 1. 2. 3.
8. Keep responses concise and scannable.

After your answer, add citations in this EXACT format:
---CITATIONS---
[{"claim":"the specific claim","doc_name":"document name","section":"section if known","excerpt":"exact quote from the source"}]
---END_CITATIONS---`;


/**
 * Strip all markdown formatting from a string.
 * This is a server-side safety net — the LLM sometimes ignores prompt rules.
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]*?)\*\*/g, "$1")   // **bold** → bold
    .replace(/\*([^*]*?)\*/g, "$1")        // *italic* → italic
    .replace(/_{2}([^_]*?)_{2}/g, "$1")    // __bold__ → bold
    .replace(/_([^_]*?)_/g, "$1")          // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, "")           // # Heading → Heading
    .replace(/^\s*[-*+]\s+/gm, "")        // - bullet → (removed)
    .replace(/`([^`]*?)`/g, "$1")          // `code` → code
    .replace(/\*+/g, "")                   // Any leftover stray *
    .replace(/\n{3,}/g, "\n\n")           // Collapse excess blank lines
    .trim();
}

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
  let citations: Citation[] = [];
  let answer = response;

  const citationStart = response.indexOf("---CITATIONS---");
  if (citationStart === -1) {
    return { answer, citations };
  }

  // Always strip everything from ---CITATIONS--- onwards from the visible answer
  // Then sanitize any markdown the LLM emitted despite our instructions
  answer = cleanMarkdown(response.slice(0, citationStart));

  // Extract the JSON block — handle both with and without ---END_CITATIONS---
  const afterMarker = response.slice(citationStart + "---CITATIONS---".length);
  const endIndex = afterMarker.indexOf("---END_CITATIONS---");
  const jsonStr = (endIndex !== -1
    ? afterMarker.slice(0, endIndex)
    : afterMarker
  ).trim();

  try {
    const parsed = JSON.parse(jsonStr);
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
    // Citation JSON malformed — answer is already clean, just return empty citations
    citations = [];
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
