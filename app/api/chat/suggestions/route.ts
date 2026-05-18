/**
 * POST /api/chat/suggestions
 * Generates 3 follow-up questions based on the last AI answer.
 */

import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { lastAnswer, provider, byokKey } = await request.json();

    if (!lastAnswer) {
      return NextResponse.json({ suggestions: [] });
    }

    const systemPrompt = `You are a follow-up question generator for a design research assistant.
Given an AI answer about product documents (PRDs, research notes, briefs),
generate exactly 3 short follow-up questions a product designer or PM would
naturally ask next. Questions must be specific to the content of the answer,
not generic. Return ONLY a valid JSON array of 3 strings. No preamble, no
markdown, no explanation.
Example: ["What success metrics are defined?", "Does the PRD address this gap?", "Which document mentions this first?"]`;

    const content = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: lastAnswer }
      ],
      {
        byokProvider: provider !== "built-in" ? provider : undefined,
        byokKey: byokKey || undefined,
        temperature: 0.7,
      }
    );

    // Try parsing the content as JSON. If the LLM returned markdown blocks like ```json ... ``` we strip them.
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const suggestions = JSON.parse(cleanContent);

    if (!Array.isArray(suggestions)) {
      throw new Error("Result is not an array");
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (error) {
    console.error("[Suggestions Error]", error);
    // Always fail gracefully
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
