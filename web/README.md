# ReviseMe (web)

The same RAG pipeline as the [mobile app](../app), rebuilt as a standalone
Next.js web app: Postgres (via [Neon](https://neon.tech), self-provisioned —
see below) replaces on-device SQLite, and Next.js API routes replace the
Cloudflare Worker — there's no separate proxy layer here, since these
routes already run server-side, so `GEMINI_API_KEY`/`GROQ_API_KEY` never
reach the browser.

This is a **separate deployment** from the mobile app, not a shared backend —
each has its own storage and its own copy of the Gemini/Groq calling code.

## Architecture differences from the mobile app

- **Storage**: Postgres via Drizzle ORM (`lib/db/schema.ts`) instead of
  SQLite. Embeddings are stored as a `jsonb` array and compared with
  brute-force cosine similarity in JS at query time (same approach as
  mobile) — no `pgvector` dependency, fine at personal-notes scale.
  `lib/db/client.ts` uses `@neondatabase/serverless`'s HTTP driver directly
  against a `DATABASE_URL` you provide (see Setup) — **not** Netlify's own
  managed database product, which turned out to require a paid
  "Credit-based" plan (a 403 `database feature not available for this
  account` on first deploy attempt, confirmed against Netlify's own
  support docs). Same underlying Postgres/Neon technology either way, just
  self-provisioned instead of paywalled.
- **Identity**: real login via Google OAuth (Auth.js / NextAuth v5,
  `lib/auth.ts`), not the anonymous-cookie scheme this app started with.
  No `users` table — Google's stable account id (`token.sub`) is used
  directly as the `userId` that scopes every row in Postgres, so there's
  nothing else to store or manage. `middleware.ts` redirects any
  unauthenticated request to `/login`.
- **OCR/voice**: photo and PDF vocab extraction call `/api/extract-text`
  (Gemini → Groq fallback, ported from the Worker) the same way. Voice input
  uses the browser's native `SpeechRecognition` API instead of a native
  module — works in Chrome, not universally supported elsewhere.

## Setup

This lives inside a larger monorepo (`app/`, `worker/`, `web/` all in one
git repo), but `netlify.toml` and the Netlify site link both live **inside
`web/` itself** — every command below runs from `web/`. (An earlier attempt
put `netlify.toml` at the repo root with `base = "web"`, Netlify's
documented monorepo approach — but it triggered a real CLI bug where `base`
got applied twice, producing a `web/web` path that doesn't exist. Keeping
everything self-contained inside `web/` sidesteps that.)

### 1. Create a free Neon Postgres database

Sign up at [neon.tech](https://neon.tech) (free tier, no card required),
create a project, and copy its connection string from the dashboard — it
looks like `postgres://user:password@ep-xxx.neon.tech/dbname?sslmode=require`.

### 2. Create a Google OAuth client

At [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials):
create an OAuth client ID, application type "Web application", and add
these as authorized redirect URIs:
```
http://localhost:8888/api/auth/callback/google
https://<your-site>.netlify.app/api/auth/callback/google
```
You'll get a client ID and client secret from this.

### 3. Link the site and set secrets

```bash
cd web
npm install -g netlify-cli   # if you don't already have it
netlify login
netlify init                  # link this folder to a Netlify site
npm install

netlify env:set DATABASE_URL "your-neon-connection-string"
netlify env:set GEMINI_API_KEY "your-key"
netlify env:set GROQ_API_KEY "your-key"    # optional, OCR backup only
netlify env:set AUTH_GOOGLE_ID "your-google-client-id"
netlify env:set AUTH_GOOGLE_SECRET "your-google-client-secret"
netlify env:set AUTH_SECRET "$(openssl rand -base64 33)"
```

Also create a local `.env` (see `.env.example`) with the same values, so
`netlify dev` and the `db:generate`/`db:migrate` scripts below can reach
the database from your machine too. The local and production apps can
point at the same Neon project — for a personal/portfolio project that's
simplest; Neon's free tier also supports branching if you want separate
dev/prod data later.

### 4. Generate and apply the schema migration

```bash
npm run db:generate    # writes SQL into drizzle/migrations/ — commit these files
npm run db:migrate      # applies pending migrations to DATABASE_URL
```

Run `db:migrate` again any time you add a new migration (locally and
against production — there's no automatic apply-on-deploy here, unlike
Netlify's own DB product).

### 5. Run locally

```bash
netlify dev
```

Open the printed URL — you'll be redirected to `/login`. Sign in with
Google, then try the golden path: add a subject, add a note, run a quiz.

### 6. Deploy

```bash
netlify deploy --prod
```
