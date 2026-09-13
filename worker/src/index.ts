export interface Env {
  GEMINI_API_KEY: string;
}

interface NoteInput {
  id: string;
  text: string;
  topic: string;
}

interface GenerateQuizRequest {
  notes: NoteInput[];
}

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;

interface EmbedRequest {
  texts: string[];
}

interface ExtractTextRequest {
  data: string; // base64-encoded file bytes
  mimeType: string; // e.g. "image/jpeg" or "application/pdf"
}

const VOCAB_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    vocabulary: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
          pronunciation: { type: "STRING" },
          translation: { type: "STRING" },
        },
        required: ["original", "pronunciation", "translation"],
      },
    },
  },
  required: ["vocabulary"],
};

const VOCAB_EXTRACTION_PROMPT = `You are helping a language learner build a vocabulary list from their notes.
Look at this file and identify ONLY the vocabulary words or short phrases being studied — skip dates,
page numbers, headers, and any surrounding sentences that aren't themselves vocabulary items.

For each vocabulary term, provide:
- "original": the term exactly as written (if handwritten, do your best to read the handwriting)
- "pronunciation": a romanized pronunciation guide (e.g. Pinyin for Chinese, Romaji for Japanese,
  Revised Romanization for Korean; for already-Latin-script languages, a phonetic respelling)
- "translation": the English meaning

Return an empty list if the file contains no vocabulary terms to extract.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          answer: { type: "STRING" },
          sourceNoteId: { type: "STRING" },
        },
        required: ["question", "answer", "sourceNoteId"],
      },
    },
  },
  required: ["questions"],
};

function buildPrompt(notes: NoteInput[]): string {
  const notesBlock = notes.map((n) => `[note id: ${n.id}] (topic: ${n.topic})\n${n.text}`).join("\n\n");
  return `You are a study-quiz generator. Using ONLY the student's own notes below, write ${Math.min(
    notes.length * 2,
    8
  )} quiz questions that test recall and understanding of this material.

For each question, include the "id" of the single note it's most based on, as "sourceNoteId".
Do not invent facts that aren't supported by the notes. Mix recall questions with at least one
application/"explain why" style question if the material allows for it.

Notes:
${notesBlock}`;
}

async function callGeminiWithRetry(
  apiKey: string,
  body: unknown,
  url: string = GEMINI_URL,
  maxAttempts = 3
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status !== 429) return response;
    lastResponse = response;
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  return lastResponse!;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleEmbed(request: Request, env: Env): Promise<Response> {
  let payload: EmbedRequest;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders() });
  }

  if (!payload.texts || payload.texts.length === 0) {
    return new Response(JSON.stringify({ embeddings: [] }), {
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  const geminiBody = {
    requests: payload.texts.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    })),
  };

  const geminiResponse = await callGeminiWithRetry(env.GEMINI_API_KEY, geminiBody, EMBEDDING_URL);

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return new Response(`Gemini embedding request failed: ${errText}`, {
      status: geminiResponse.status,
      headers: corsHeaders(),
    });
  }

  const geminiJson: any = await geminiResponse.json();
  const embeddings: number[][] = geminiJson.embeddings.map((e: { values: number[] }) => e.values);

  return new Response(JSON.stringify({ embeddings }), {
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function handleExtractText(request: Request, env: Env): Promise<Response> {
  let payload: ExtractTextRequest;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders() });
  }

  if (!payload.data || !payload.mimeType) {
    return new Response("Missing data or mimeType", { status: 400, headers: corsHeaders() });
  }

  const geminiBody = {
    contents: [
      {
        parts: [{ inlineData: { mimeType: payload.mimeType, data: payload.data } }, { text: VOCAB_EXTRACTION_PROMPT }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VOCAB_RESPONSE_SCHEMA,
    },
  };

  const geminiResponse = await callGeminiWithRetry(env.GEMINI_API_KEY, geminiBody);

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return new Response(`Gemini text extraction failed: ${errText}`, {
      status: geminiResponse.status,
      headers: corsHeaders(),
    });
  }

  const geminiJson: any = await geminiResponse.json();
  const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

  const parsed = rawText
    ? (JSON.parse(rawText) as { vocabulary: { original: string; pronunciation: string; translation: string }[] })
    : { vocabulary: [] };

  const text = parsed.vocabulary.map((v) => `${v.original} : ${v.pronunciation} : ${v.translation}`).join("\n");

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/embed" && request.method === "POST") {
      return handleEmbed(request, env);
    }

    if (url.pathname === "/extract-text" && request.method === "POST") {
      return handleExtractText(request, env);
    }

    if (url.pathname !== "/generate-quiz" || request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: corsHeaders() });
    }

    let payload: GenerateQuizRequest;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400, headers: corsHeaders() });
    }

    if (!payload.notes || payload.notes.length === 0) {
      return new Response(JSON.stringify({ questions: [] }), {
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const geminiBody = {
      contents: [{ parts: [{ text: buildPrompt(payload.notes) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const geminiResponse = await callGeminiWithRetry(env.GEMINI_API_KEY, geminiBody);

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(`Gemini request failed: ${errText}`, {
        status: geminiResponse.status,
        headers: corsHeaders(),
      });
    }

    const geminiJson: any = await geminiResponse.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response("Gemini returned no content", { status: 502, headers: corsHeaders() });
    }

    const parsed = JSON.parse(rawText) as {
      questions: { question: string; answer: string; sourceNoteId: string }[];
    };

    const questions = parsed.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
      sourceChunkIds: [q.sourceNoteId],
    }));

    return new Response(JSON.stringify({ questions }), {
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  },
};
