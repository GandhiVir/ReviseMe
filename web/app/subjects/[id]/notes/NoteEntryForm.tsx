"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SourceType } from "@/lib/types";

function appendText(existing: string, addition: string): string {
  const trimmed = addition.trim();
  if (!trimmed) return existing;
  return existing ? `${existing}\n\n${trimmed}` : trimmed;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NoteEntryForm({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [weekNumber, setWeekNumber] = useState("1");
  const [topic, setTopic] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("typed");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  async function handleFiles(files: File[], isPdf: boolean) {
    if (files.length === 0) return;
    setScanning(true);
    setError(null);
    const failed: string[] = [];
    let lastError = "";
    try {
      // One at a time, in order: keeps the notes in upload order and stays inside Gemini's rate limits.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setScanProgress(files.length > 1 ? `${i + 1} of ${files.length}` : "");
        try {
          const base64 = await fileToBase64(file);
          const res = await fetch("/api/extract-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, mimeType: isPdf ? "application/pdf" : file.type || "image/jpeg" }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Extraction failed");
          const { text } = await res.json();
          setRawText((prev) => appendText(prev, text));
          setSourceType(isPdf ? "pdf" : "ocr");
        } catch (e) {
          failed.push(file.name);
          lastError = e instanceof Error ? e.message : String(e);
        }
      }
      if (failed.length > 0) {
        setError(
          files.length === 1
            ? lastError
            : `Couldn't read ${failed.length} of ${files.length} files (${failed.join(", ")}): ${lastError}`
        );
      }
    } finally {
      setScanning(false);
      setScanProgress("");
    }
  }

  function handleToggleRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input isn't supported in this browser — try Chrome.");
      return;
    }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setRawText((prev) => appendText(prev, transcript));
      setSourceType("voice");
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  async function handleSave() {
    if (!topic.trim() || !rawText.trim()) {
      setError("Please fill in both a topic and your notes.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, weekNumber: Number(weekNumber) || 1, rawText, topic: topic.trim(), sourceType }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border/60">
          <div className="flex gap-4">
            <div className="w-24">
              <label className="mb-1 block text-xs font-semibold text-text-muted">Week</label>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-text-muted">Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder='e.g. "verb conjugation"'
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border/60">
          <label className="mb-1 block text-xs font-semibold text-text-muted">Notes</label>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setSourceType("typed");
            }}
            placeholder="Type, scan a photo, upload a PDF, or record a voice note..."
            className="h-64 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft lg:h-80"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border/60">
          <p className="mb-3 text-xs font-bold text-text">Capture</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={scanning}
              className="rounded-xl bg-primary-soft py-3 text-sm font-semibold text-on-soft transition hover:bg-primary/20 disabled:opacity-50"
            >
              {scanning ? `Reading… ${scanProgress}` : "📷 Upload photos"}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                handleFiles(files, false);
              }}
            />

            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={scanning}
              className="rounded-xl bg-primary-soft py-3 text-sm font-semibold text-on-soft transition hover:bg-primary/20 disabled:opacity-50"
            >
              {scanning ? `Reading… ${scanProgress}` : "📄 Upload PDFs"}
            </button>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                handleFiles(files, true);
              }}
            />

            <button
              onClick={handleToggleRecording}
              className={`rounded-xl py-3 text-sm font-semibold transition ${
                recording ? "bg-danger text-white" : "bg-primary-soft text-on-soft hover:bg-primary/20"
              }`}
            >
              {recording ? "⏹ Stop recording" : "🎤 Record voice"}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-[#9333ea] to-accent py-4 font-bold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
        >
          {saving ? "Saving..." : "✓ Save note"}
        </button>
      </div>
    </div>
  );
}
