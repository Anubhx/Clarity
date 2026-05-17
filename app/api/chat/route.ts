/**
 * Chat API Route
 * POST /api/chat
 */

import { NextRequest, NextResponse } from "next/server";
import { retrievalAgent } from "@/agents/retrieval";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { message, conversation_history = [], document_ids } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await retrievalAgent(
      message,
      conversation_history,
      document_ids
    );

    return NextResponse.json({
      answer: result.answer,
      citations: result.citations,
      confidence: result.confidence,
      sources_used: result.sources_used,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API/chat] Error:", errorMessage);

    // Return the actual error message so the user knows what happened
    return NextResponse.json(
      {
        answer: `⚠️ ${errorMessage}`,
        citations: [],
        confidence: 0,
        sources_used: [],
      },
      { status: 200 } // Return 200 so the message shows in chat
    );
  }
}
