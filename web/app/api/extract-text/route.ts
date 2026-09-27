import { NextResponse } from "next/server";
import { extractVocabularyViaGemini } from "@/lib/gemini";
import { extractVocabularyViaGroq } from "@/lib/groq";

interface ExtractTextBody {
  data: string; // base64-encoded file bytes
  mimeType: string; // e.g. "image/jpeg" or "application/pdf"
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExtractTextBody;

    if (!body.data || !body.mimeType) {
      return NextResponse.json({ error: "data and mimeType are required" }, { status: 400 });
    }

    try {
      const text = await extractVocabularyViaGemini(body.data, body.mimeType);
      return NextResponse.json({ text });
    } catch (geminiError) {
      const groqText = await extractVocabularyViaGroq(body.data, body.mimeType);
      if (groqText !== null) {
        return NextResponse.json({ text: groqText });
      }
      throw geminiError;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Text extraction failed: ${message}` }, { status: 502 });
  }
}
