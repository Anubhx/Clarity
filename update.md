# Clarity Updates & Features Audit Log
*A timeline of recent fixes, features, and system architecture updates for the Clarity Research Assistant.*

---

## 🛠 Features & Implementations

### 1. Robust Multi-Provider AI Architecture
- **Provider Abstraction Layer:** Upgraded the core LLM orchestration (`lib/llm.ts`) to handle multiple API providers dynamically instead of just DeepSeek.
- **Failover / Cascade Fallback:** Built an intelligent cascading system where the app defaults to DeepSeek (primary), and seamlessly falls back to Google Gemini (secondary) if DeepSeek credits run out (402) or rate limits (429) hit.
- **Key Rotation System:** Created a `KeyRotator` utility class that handles arrays of API keys. It temporarily cools down keys hitting rate limits (60 seconds) and permanently bans keys showing zero balance, keeping the app 100% online without user disruption.

### 2. BYOK (Bring Your Own Key) Support
- **Secure Client-Side Storage:** Added BYOK support across 4 major providers: DeepSeek, Google Gemini, OpenAI, and Anthropic.
- **Privacy First:** Keys are stored exclusively in the browser's session state (using Zustand). They are never saved to the backend database, ensuring user trust.
- **UI Integration:** Fully fleshed out the "AI & API" Settings tab allowing users to override the built-in system with their own keys instantly.

### 3. Comprehensive Settings & Integrations UI
- **Google Drive OAuth Pipeline:** Wired the Google Drive "Connect" button to initiate an OAuth 2.0 flow (`/api/integrations/google-drive/auth`).
- **OAuth Callback Security:** Set up the callback receiver (`/api/integrations/google-drive/callback`) which securely stores the resulting access token in a temporary, HTTP-only cookie.
- **Theme & Appearance (Dark Mode):** Integrated `next-themes` to support real System, Light, and Dark modes.

### 4. Interactive Chat Actions
- Wired up the quick-action chat buttons below the input box to instantly fire specific analytical prompts into the RAG pipeline.
- Implemented Actions: 
  - **All docs:** *"Answer this question using all uploaded documents."*
  - **Find contradictions:** *"Find all contradictions and conflicting statements across the selected documents..."*
  - **Find gaps:** *"Identify missing information, weak sections..."*
  - **Summarise:** *"Create a structured summary with key themes..."*

### 5. Document Management Lifecycle
- **Delete All Documents:** Implemented a secure account wipe feature inside Settings. A new API (`DELETE /api/documents/delete-all`) correctly deletes vector chunks first (to satisfy foreign key constraints), then deletes the document records.
- **Individual Document Deletion:** Added a red trash icon to each document card in the library. Built the dynamic Next.js API route (`DELETE /api/documents/[id]`) to delete single records, updating the UI instantly without page reloads.

---

## 🐛 Bug Fixes & Refinements

- **Next.js 16 Asynchronous Params Fix:** Fixed server crash loops inside dynamic API routes (like single document delete) by conforming to the latest Next.js 15/16 App Router requirements where route `params` are now asynchronous Promises and must be `await`ed before access.
- **Dark Mode UI Anomalies:** Fixed a critical CSS bug where the sidebar background had a hardcoded light-grey hex value (`#FAFAF8`). When users toggled Dark Mode, the text became white but the background remained white, making the logo and navigation invisible. The background now maps dynamically to `var(--color-white)`.
- **System Prompt Refinements:** Added an explicit command (`6. Dont have ( #,+,-,* ) any special characters in the answer`) inside the Retrieval Agent context to format responses cleanly for the frontend UI.
- **Local Dev Port Alignments:** Corrected `.env.local` to point the `NEXT_PUBLIC_APP_URL` to `http://localhost:3001` so that the Google OAuth Redirect URI mismatch errors were resolved.
- **Audit Logging:** Implemented comprehensive server-side logging for all LLM calls (tokens used, response latency, provider selected, endpoint status codes) to track DeepSeek and Gemini consumption accurately.
