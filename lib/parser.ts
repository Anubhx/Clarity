/**
 * Document Parser
 * Extracts plain text from PDF, DOCX, TXT, and Markdown files
 */

interface ParseResult {
  text: string;
  wordCount: number;
  pageCount?: number;
}

/** Parse a file buffer based on MIME type */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParseResult> {
  switch (mimeType) {
    case "application/pdf":
      return parsePdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer);
    case "text/plain":
    case "text/markdown":
      return parsePlainText(buffer);
    default:
      // Try to detect by extension
      if (fileName.endsWith(".pdf")) return parsePdf(buffer);
      if (fileName.endsWith(".docx")) return parseDocx(buffer);
      if (fileName.endsWith(".md") || fileName.endsWith(".txt")) return parsePlainText(buffer);
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    return {
      text,
      wordCount: countWords(text),
      pageCount: data.numpages,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Parser] PDF parse failed:", msg);
    throw new Error(`PDF parsing failed: ${msg}`);
  }
}

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    return {
      text,
      wordCount: countWords(text),
    };
  } catch (err) {
    console.error("[Parser] DOCX parse failed:", err);
    throw new Error("Failed to parse DOCX file");
  }
}

function parsePlainText(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8").trim();
  return {
    text,
    wordCount: countWords(text),
  };
}

function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
