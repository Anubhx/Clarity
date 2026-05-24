import { GoogleGenerativeAI } from "@google/generative-ai";
import { KeyRotator } from "./providers/key-rotator";

const keys = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

// We use the same KeyRotator abstraction to handle cooldowns and exhaustion
const rotator = new KeyRotator("GeminiEmbeddings", keys);

/**
 * Generate a 1536-dimensional vector embedding for the given text
 * using Google Gemini's gemini-embedding-001 model (native 3072d, truncated
 * to 1536 via Matryoshka subspace to match the Supabase vector(1536) column).
 *
 * Returns null if all keys are exhausted or rate-limited — callers
 * should handle null gracefully and fall back to FTS-only search.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  for (let i = 0; i < rotator.keyCount; i++) {
    const keyInfo = rotator.getNextKey();
    if (!keyInfo) break;

    try {
      const genAI = new GoogleGenerativeAI(keyInfo.key);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      
      const result = await model.embedContent({
        content: { parts: [{ text }], role: "user" },
        taskType: "RETRIEVAL_DOCUMENT",
      } as Parameters<typeof model.embedContent>[0]);
      const embedding = result.embedding;
      
      rotator.markSuccess(keyInfo.index);
      // gemini-embedding-001 outputs 3072d; truncate to 1536 to match vector(1536) in Supabase.
      // Matryoshka models preserve quality in leading dimensions.
      return embedding.values.slice(0, 1536);
    } catch (err) {
      const status = extractStatus(err);
      const msg = err instanceof Error ? err.message : String(err);
      rotator.markFailed(keyInfo.index, status, msg);
    }
  }
  
  console.warn("[Embeddings] All keys exhausted — storing chunk without embedding (FTS fallback active).");
  return null;
}

function extractStatus(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) return 429;
  if (msg.includes("403") || msg.includes("permission")) return 403;
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("API_KEY_INVALID")) return 401;
  return 500;
}
