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
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  async function handleFile(file: File, mimeType: string, isPdf: boolean) {
    setScanning(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, mimeType }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Extraction failed");
      const { text } = await res.json();
      setRawText((prev) => appendText(prev, text));
      setSourceType(isPdf ? "pdf" : "ocr");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
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
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex gap-4">
          <div className="w-20">
            <label className="mb-1 block text-xs font-semibold text-text-muted">Week</label>
            <input
              type="number"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-text-muted">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g. "verb conjugation"'
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <label className="mb-1 block text-xs font-semibold text-text-muted">Notes</label>
        <textarea
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setSourceType("typed");
          }}
          placeholder="Type, scan a photo, upload a PDF, or record a voice note..."
          className="h-40 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <p className="mb-3 text-xs font-bold text-text">Capture</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={scanning}
            className="rounded-xl bg-primary-soft py-3 text-xs font-semibold text-primary-dark disabled:opacity-50"
          >
            {scanning ? "..." : "📷 Upload photo"}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file, file.type || "image/jpeg", false);
              e.target.value = "";
            }}
          />

          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={scanning}
            className="rounded-xl bg-primary-soft py-3 text-xs font-semibold text-primary-dark disabled:opacity-50"
          >
            {scanning ? "..." : "📄 Upload PDF"}
          </button>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file, "application/pdf", true);
              e.target.value = "";
            }}
          />

          <button
            onClick={handleToggleRecording}
            className={`col-span-2 rounded-xl py-3 text-xs font-semibold ${
              recording ? "bg-danger text-white" : "bg-primary-soft text-primary-dark"
            }`}
          >
            {recording ? "⏹ Stop recording" : "🎤 Record voice"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-gradient-to-r from-[#9333ea] to-accent py-4 font-bold text-white shadow-sm disabled:opacity-50"
      >
        {saving ? "Saving..." : "✓ Save note"}
      </button>
    </div>
  );
}
