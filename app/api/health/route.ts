/**
 * Health Check + Provider Status API
 * GET /api/health
 */

import { NextResponse } from "next/server";
import { getLLMStatus } from "@/lib/llm";

export async function GET(): Promise<NextResponse> {
  const llm = getLLMStatus();

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    llm: {
      mode: llm.mode,
      total_api_calls: llm.totalCalls,
      builtin_priority: llm.builtInPriority,
      providers: llm.providers.map((p) => ({
        id: p.id,
        name: p.name,
        total_keys: p.totalKeys,
        available_keys: p.availableKeys,
        exhausted_keys: p.exhaustedKeys,
        cooldown_keys: p.cooldownKeys,
        total_calls: p.totalCalls,
      })),
    },
  });
}
