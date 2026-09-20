# ReviseMe (web)

The same RAG pipeline as the [mobile app](../app), rebuilt as a standalone
Next.js web app: Netlify DB (serverless Postgres, via Neon) replaces
on-device SQLite, and Next.js API routes replace the Cloudflare Worker —
there's no separate proxy layer here, since these routes already run
server-side, so `GEMINI_API_KEY`/`GROQ_API_KEY` never reach the browser.

This is a **separate deployment** from the mobile app, not a shared backend —
each has its own storage and its own copy of the Gemini/Groq calling code.

## Architecture differences from the mobile app

- **Storage**: Postgres via Drizzle ORM (`lib/db/schema.ts`) instead of
  SQLite. Embeddings are stored as a `jsonb` array and compared with
  brute-force cosine similarity in JS at query time (same approach as
  mobile) — no `pgvector` dependency, fine at personal-notes scale.
- **Identity**: no login system. Each browser gets a random id in an
  `httpOnly` cookie (`lib/session.ts`), and every row is scoped to it — the
  minimum needed so two visitors to the public site don't see each other's
  data. Not a substitute for real auth (a cleared cookie jar loses access to
  that data, and there's no cross-device sync).
- **OCR/voice**: photo and PDF vocab extraction call `/api/extract-text`
  (Gemini → Groq fallback, ported from the Worker) the same way. Voice input
  uses the browser's native `SpeechRecognition` API instead of a native
  module — works in Chrome, not universally supported elsewhere.

## Setup

### 1. Provision Netlify DB

```bash
npm install -g netlify-cli   # if you don't already have it
netlify login
netlify init                  # link this folder to a Netlify site
netlify db init                # provisions a Neon Postgres DB, sets NETLIFY_DATABASE_URL
```

### 2. Set the AI provider secrets

```bash
netlify env:set GEMINI_API_KEY "your-key"
netlify env:set GROQ_API_KEY "your-key"    # optional, OCR backup only
```

### 3. Push the schema

```bash
npm install
netlify env:get NETLIFY_DATABASE_URL       # copy this into a local .env as NETLIFY_DATABASE_URL
npm run db:push
```

### 4. Run locally

```bash
netlify dev
```

`netlify dev` injects the real env vars (including `NETLIFY_DATABASE_URL`)
automatically — no need to hand-maintain a `.env` beyond what `db:push`
needed above.

### 5. Deploy

```bash
netlify deploy --prod
```

Netlify auto-detects Next.js and handles the build/runtime wiring — no
`publish` directory to configure.
