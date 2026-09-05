# ReviseMe

A weekly-notes revision app: capture what you learned in class each week, and get
AI-generated quizzes that target what you're due to review — built to show a real
RAG (retrieval-augmented generation) pipeline, not just a chatbot wrapper.

## Architecture

Storage stays on-device; both embeddings and quiz generation run through
Gemini's free tier via the Worker proxy:

| Piece | Where it runs | How |
|---|---|---|
| Storage (notes, chunks, mastery) | On-device | SQLite (`expo-sqlite`) |
| Embeddings | Cloud, free tier | `gemini-embedding-001`, called through the Worker's `/embed` endpoint, see `src/embeddings/embed.ts` |
| Retrieval | On-device | Brute-force cosine similarity over locally stored vectors |
| OCR (photographed notes) | Cloud, free tier, on-device fallback | Gemini vision (handles handwriting + non-Latin scripts) via the Worker's `/extract-text`; falls back to on-device ML Kit (Latin print only) if Gemini is rate-limited or unreachable, see `src/ocr` |
| PDF import | Cloud, free tier | Gemini reads the PDF directly via `/extract-text` (no on-device fallback — ML Kit only handles images) |
| Voice notes | On-device | Platform speech recognition via `expo-speech-recognition`, see `src/voice` |
| Spaced repetition scheduling | On-device | SM-2 algorithm, `src/spacedRepetition/sm2.ts` |
| Quiz generation | Cloud, free tier | `gemini-3.6-flash`, called through the Worker's `/generate-quiz` endpoint |

Embeddings originally ran fully on-device via `onnxruntime-react-native`
(all-MiniLM-L6-v2). That's abandoned for now: the native module wouldn't
register at runtime under this React Native version's architecture (native
code compiled and linked fine, but neither `NativeModules` nor
`TurboModuleRegistry` could resolve it — see git history for the debugging
trail). Moving embeddings to the same free-tier Worker proxy already used
for generation sidesteps that entirely, at the cost of requiring network
access for retrieval (no fully-offline mode) and counting against Gemini's
free-tier rate limits a bit more often.

The proxy exists for exactly one reason: an API key bundled inside a shipped
mobile app can be extracted from the app binary. The Worker is a stateless
pass-through — it never stores notes, embeddings, or quiz data — so the
on-device-storage property of the app is untouched by its existence.

```
ReviseMe/
  app/     Expo React Native app (this is what ships to the App/Play Store)
  worker/  Cloudflare Worker proxy that holds the Gemini API key
```

## Getting started

### 1. Worker (deploy first, you'll need its URL for the app)

```bash
cd worker
npm install
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

Copy the deployed Worker URL into `app/.env` (see below).

### 2. App

```bash
cd app
npm install
cp .env.example .env
# edit .env: set EXPO_PUBLIC_QUIZ_PROXY_URL to your deployed Worker URL
npx expo start
```

## What's fully implemented vs. what's a TODO

Fully working:
- SQLite schema + CRUD for subjects, weekly notes, chunks, quiz attempts, mastery
- SM-2 spaced-repetition scheduler (due dates, streaks, weak-spot weighting)
- Real embeddings via Gemini's `gemini-embedding-001`, batched per note
  through the Worker's `/embed` endpoint (`src/embeddings/embed.ts`) —
  genuine semantic similarity, not a placeholder.
- Cosine-similarity retrieval over stored chunk embeddings
- **OCR**: Gemini vision via the Worker, with on-device ML Kit
  (`@react-native-ml-kit/text-recognition`) as a fallback on rate limits or
  network failure — wired into the note entry screen behind a "Scan photo"
  button (camera or photo library).
- **PDF import**: Gemini reads PDFs directly (including scanned/handwritten
  pages) via the Worker — wired in behind an "Upload PDF" button.
- **Voice notes**: `expo-speech-recognition`, wired into the note entry screen
  behind a record/stop toggle.
- Gemini quiz generation via the Worker proxy, with source-chunk citations
- Navigation + screens wiring all of the above end-to-end

Because OCR and voice are native modules, this app can no longer run in
Expo Go — it needs a **dev-client build**. See below.

## Building a dev client (EAS Build)

```bash
cd app
npm install -g eas-cli   # if you don't already have it
eas login
eas build --profile development --platform android   # or --platform ios
```

This builds in the cloud and gives you an install link (or QR code) for a
custom Expo Go-like client that includes the native modules this project
needs. Install that on your device, then run `npx expo start --dev-client`
and connect to it the same way you did with Expo Go.

iOS builds additionally require an Apple Developer account for device
installs outside the simulator; Android has no such requirement.

## Known install quirks (Windows)

- `npm install` in `app/` may fail on a `react-native-screens` postinstall
  step (`bob build`) if `react-native-builder-bob` isn't resolvable as a
  global command on your machine. It's a build step for that package's own
  tooling, unrelated to this project's code. Workaround:
  `npm install --ignore-scripts`.
- Both `app/` and `worker/` may fail Cloudflare/Wrangler commands with a
  generic `fetch failed` if your network has broken IPv6 connectivity —
  Node's `fetch` tries IPv6 first and hangs. Fix: set
  `$env:NODE_OPTIONS = "--dns-result-order=ipv4first"` before running
  `wrangler`/`npx` commands in that terminal session.

## Free-tier notes

Gemini's free tier has per-minute and per-day request caps that change over
time — check the current limits before relying on them for a public release.
The Worker includes a basic backoff/retry on 429s for quiz generation; the
`/embed` and `/extract-text` endpoints don't yet, though `/extract-text`'s
main caller (image OCR) already falls back to on-device ML Kit on a 429, so
that one degrades gracefully. Embeddings run once per note (batched across
its chunks) rather than once per app session, so it's worth watching usage
if you're taking a lot of notes in a short window.
