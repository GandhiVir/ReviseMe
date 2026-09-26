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
  `lib/db/client.ts` uses `@netlify/database`'s `getDatabase()` helper
  rather than reading `NETLIFY_DATABASE_URL` directly — that helper returns
  a different driver depending on context (a plain `pg.Pool` against
  `netlify dev`'s local Postgres, or Neon's HTTP client in production), and
  `neon()`'s HTTP driver alone can't talk to a local Postgres at all.
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

This lives inside a larger monorepo (`app/`, `worker/`, `web/` all in one
git repo), but `netlify.toml` and the Netlify site link both live **inside
`web/` itself** — every command below, `netlify` and `npm` alike, runs from
`web/`. (An earlier attempt put `netlify.toml` at the repo root with
`base = "web"`, which is Netlify's documented approach for monorepos — but
in practice it triggered a real CLI bug where `base` got applied twice,
producing a `web/web` path that doesn't exist. Keeping everything self-
contained inside `web/` sidesteps that entirely, at the cost of Netlify's
git-based continuous deployment needing to be pointed at this subdirectory
separately if that's set up later.)

### 1. Provision Netlify DB

```bash
cd web
npm install -g netlify-cli   # if you don't already have it
netlify login
netlify init                  # link this folder to a Netlify site
netlify db init                # sets up Drizzle + @netlify/database, no sample data
npm install
```

### 2. Set the AI provider secrets

```bash
netlify env:set GEMINI_API_KEY "your-key"
netlify env:set GROQ_API_KEY "your-key"    # optional, OCR backup only
```

### 3. Generate and apply a migration from the schema

```bash
npm run db:generate
netlify database migrations apply
```

`db:generate` writes SQL into `netlify/database/migrations/` — commit these
files. `migrations apply` actually runs it against `netlify dev`'s local
Postgres (this doesn't happen automatically just by having `netlify dev`
running — skip it and every query fails with `relation "subjects" does not
exist`). Run `migrations apply` again any time you add a new migration.

### 4. Run locally

```bash
netlify dev
```

This starts a local Postgres automatically and applies pending migrations
to it — no `.env` needed for the database at all (see the `getDatabase()`
note above). Open the printed URL and try the golden path: add a subject,
add a note, run a quiz.

### 5. Deploy

```bash
netlify deploy --prod
```

The first deploy is what actually provisions the real Neon database in
production (`netlify database status` will say "not enabled" until this
happens) and applies the same migrations to it.
