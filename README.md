# Clarity — Design Research Assistant

> Ask anything. Know everything. Cite the source.

A RAG-powered design research assistant that lets product designers and PMs query, synthesise, and find gaps across their document library — PRDs, research notes, competitive analyses, and design briefs — using natural language, with every answer cited back to the source.

## ✨ Features

- **Cited Answers** — Every claim links back to the exact document and section
- **Contradiction Finder** — Spot conflicts across multiple documents
- **Gap Finder** — Identify missing sections in PRDs and briefs
- **Document Health Cards** — Completeness scores and key theme extraction
- **Multi-Document RAG** — Query across all uploaded documents simultaneously
- **Streaming Responses** — See answers appear in real-time
- **Multi-Provider AI** — DeepSeek → Gemini automatic fallback with key rotation
- **BYOK Support** — Bring your own API keys for OpenAI, Anthropic, Gemini, or DeepSeek

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + vanilla CSS design system |
| Auth | Clerk |
| LLM | DeepSeek + Google Gemini (with fallback) |
| Vector DB | Supabase pgvector |
| State | Zustand |
| Motion | Framer Motion |
| Icons | Lucide React |
| Upload | react-dropzone |
| Parsing | pdf-parse, mammoth |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm
- Supabase account
- Clerk account
- DeepSeek and/or Gemini API key(s)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/clarity.git
cd clarity
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# DeepSeek — comma-separated keys for rotation
DEEPSEEK_API_KEYS=sk-key1,sk-key2,sk-key3

# Google Gemini — comma-separated keys for rotation
GEMINI_API_KEYS=AIza-key1,AIza-key2,AIza-key3

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Set Up Supabase Database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and run the contents of `supabase/schema.sql`

This will:
- Enable the `pgvector` extension
- Create `documents` and `document_chunks` tables
- Create HNSW index for fast vector search
- Create the `match_documents` RPC function
- Set up Row Level Security policies

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Folder Structure

```
clarity/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated app pages
│   │   ├── chat/           # Q&A interface
│   │   ├── documents/      # Document library
│   │   ├── summaries/      # Doc health cards
│   │   ├── settings/       # App settings
│   │   └── layout.tsx      # App shell (sidebar)
│   ├── sign-in/            # Clerk sign-in
│   ├── sign-up/            # Clerk sign-up
│   ├── api/                # API routes
│   │   ├── chat/           # Chat endpoint
│   │   ├── documents/      # Document CRUD + upload
│   │   └── health/         # Health check
│   ├── globals.css         # Design system CSS
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── agents/                 # Agent logic
│   └── retrieval.ts        # Core RAG agent
├── components/             # UI components
│   └── layout/             # Sidebar, Header
├── config/                 # App config
│   ├── site.ts             # Metadata
│   └── constants.ts        # All constants
├── lib/                    # Shared utilities
│   ├── deepseek.ts         # DeepSeek API + key rotation
│   ├── supabase.ts         # Supabase clients
│   ├── vector-store.ts     # pgvector operations
│   ├── chunker.ts          # Document chunking
│   ├── parser.ts           # PDF/DOCX/MD parsing
│   └── utils.ts            # Helpers
├── store/                  # Zustand stores
│   ├── chat.store.ts
│   └── documents.store.ts
├── types/                  # TypeScript types
│   ├── agent.types.ts
│   ├── chat.types.ts
│   └── document.types.ts
├── supabase/
│   └── schema.sql          # Database schema
├── middleware.ts            # Clerk auth middleware
└── .env.local.example      # Environment template
```

## 🎨 Design System

Built from a custom brand kit:

- **Colors**: Blue (#4A7FF8), Coral (#FF7648), Amber (#FFC757), Surface (#F0EFEB)
- **Typography**: DM Sans (body) + JetBrains Mono (code)
- **Spacing**: 8px base grid
- **Radius**: 6px → 28px scale
- **Motion**: Purposeful transitions, no decoration
- **Elevation**: Border-based (no shadows)

## 📄 License

MIT
