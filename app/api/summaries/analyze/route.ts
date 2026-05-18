/**
 * POST /api/summaries/analyze
 * Analyzes a document and caches the result in documents.health_data
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { callLLM } from "@/lib/llm";
import { getDocumentChunks } from "@/lib/vector-store";

const SYSTEM_PROMPT = `Analyze this product document and return ONLY a valid JSON object.
No preamble, no markdown, no explanation. Valid JSON only.

Return exactly this structure:
{
  "completeness_score": number between 0 and 100,
  "key_themes": array of max 5 short strings,
  "missing_sections": array of objects with "name" string and "severity" of "high" or "medium",
  "key_decisions": array of max 4 short strings,
  "open_questions": array of max 3 short strings
}

If a field has no content return an empty array. Never return null.`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { document_id, documentId, force_refresh } = body;
    const docId = document_id || documentId;

    if (!docId) {
      return NextResponse.json({ error: "document_id required" }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // ── Fetch document record ────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, name, health_data")
      .eq("id", docId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // ── Return cached result unless force refresh requested ──
    if (doc.health_data && !force_refresh) {
      return NextResponse.json({ health_data: doc.health_data, cached: true });
    }

    // ── Fetch document chunks for analysis ──────────────────
    const chunks = await getDocumentChunks(docId);
    if (!chunks.length) {
      return NextResponse.json(
        { error: "No content found for this document. Make sure it has finished indexing." },
        { status: 422 }
      );
    }

    // Combine up to ~12k chars of content for the LLM
    const documentContent = chunks
      .slice(0, 30)
      .map((c) => c.content)
      .join("\n\n")
      .slice(0, 12000);

    // ── Call LLM via shared abstraction (DeepSeek → Gemini fallback) ─
    let rawResponse: string;
    try {
      rawResponse = await callLLM([
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Document name: "${doc.name}"\n\nDocument content:\n${documentContent}`,
        },
      ]);
    } catch (llmErr) {
      console.error("[API/summaries/analyze] LLM call failed:", llmErr);
      return NextResponse.json(
        { error: "Could not analyze document" },
        { status: 500 }
      );
    }

    // ── Parse JSON defensively ──────────────────────────────
    let health_data: unknown;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      // Find first { to last } in case of extra preamble
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      const jsonStr =
        jsonStart !== -1 && jsonEnd !== -1
          ? cleaned.slice(jsonStart, jsonEnd + 1)
          : cleaned;

      health_data = JSON.parse(jsonStr);
    } catch {
      console.error("[API/summaries/analyze] JSON parse failed. Raw:", rawResponse.slice(0, 300));
      return NextResponse.json(
        { error: "Could not analyze document" },
        { status: 500 }
      );
    }

    // ── Cache result in Supabase ────────────────────────────
    const { error: updateErr } = await supabase
      .from("documents")
      .update({ health_data })
      .eq("id", docId);

    if (updateErr) {
      // Non-fatal — still return the result
      console.error("[API/summaries/analyze] Cache write failed:", updateErr.message);
    }

    return NextResponse.json({ health_data, cached: false });
  } catch (error) {
    console.error("[API/summaries/analyze] Unexpected error:", error);
    return NextResponse.json({ error: "Could not analyze document" }, { status: 500 });
  }
}
