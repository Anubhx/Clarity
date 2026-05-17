export const siteConfig = {
  name: "Clarity",
  tagline: "Ask anything. Know everything. Cite the source.",
  description:
    "A RAG-powered design research assistant that lets product designers and PMs query, synthesise, and find gaps across their document library.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

export const AGENT_VERSIONS = {
  orchestrator: "1.0.0",
  retrieval: "1.0.0",
  contradiction: "1.0.0",
  summary: "1.0.0",
  gap_finder: "1.0.0",
  drive: "1.0.0",
} as const;
