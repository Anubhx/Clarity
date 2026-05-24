import { GoogleGenerativeAI } from "@google/generative-ai";
import { KeyRotator } from "./providers/key-rotator";

const keys = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

// We use the same KeyRotator abstraction to handle cooldowns and exhaustion
const rotator = new KeyRotator("GeminiEmbeddings", keys);

/**
 * Generate a 768-dimensional vector embedding for the given text
 * using Google Gemini's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  for (let i = 0; i < rotator.keyCount; i++) {
    const keyInfo = rotator.getNextKey();
    if (!keyInfo) break;

    try {
      const genAI = new GoogleGenerativeAI(keyInfo.key);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      const result = await model.embedContent(text);
      const embedding = result.embedding;
      
      rotator.markSuccess(keyInfo.index);
      return embedding.values;
    } catch (err) {
      const status = extractStatus(err);
      const msg = err instanceof Error ? err.message : String(err);
      rotator.markFailed(keyInfo.index, status, msg);
    }
  }
  
  throw new Error("Failed to generate embedding: All Gemini API keys exhausted or rate limited.");
}

function extractStatus(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) return 429;
  if (msg.includes("403") || msg.includes("permission")) return 403;
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("API_KEY_INVALID")) return 401;
  return 500;
}
