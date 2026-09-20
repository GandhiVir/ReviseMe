"use client";

import { useState } from "react";
import type { Chunk, QuizMode, QuizQuestion } from "@/lib/types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

/** Local heuristic only — the Got it right/wrong buttons stay the real grade. */
function looksCorrect(userAnswer: string, correctAnswer: string): boolean {
  const userNorm = normalize(userAnswer);
  const correctNorm = normalize(correctAnswer);
  if (!userNorm) return false;
  if (userNorm === correctNorm) return true;
  if (correctNorm.includes(userNorm) || userNorm.includes(correctNorm)) return true;

  const correctWords = correctNorm.split(/\s+/).filter((w) => w.length > 2);
  if (correctWords.length === 0) return false;
  const userWords = new Set(userNorm.split(/\s+/));
  const matched = correctWords.filter((w) => userWords.has(w)).length;
  return matched / correctWords.length >= 0.6;
}

function ModePicker({ onSelect }: { onSelect: (mode: QuizMode) => void }) {
  const [weekInput, setWeekInput] = useState("");
  const [topicQuery, setTopicQuery] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">How do you want to revise?</h1>

      <button
        onClick={() => onSelect({ kind: "due" })}
        className="flex items-center justify-between rounded-2xl bg-surface p-5 text-left shadow-sm"
      >
        <div>
          <p className="font-bold">📅 Due for review</p>
          <p className="text-xs text-text-muted">Topics scheduled for review today</p>
        </div>
        <span className="text-text-muted">›</span>
      </button>

      <button
        onClick={() => onSelect({ kind: "weakSpots" })}
        className="flex items-center justify-between rounded-2xl bg-surface p-5 text-left shadow-sm"
      >
        <div>
          <p className="font-bold">🏋️ Weak spots</p>
          <p className="text-xs text-text-muted">Topics you've struggled with most</p>
        </div>
        <span className="text-text-muted">›</span>
      </button>

      <div className="flex items-center gap-3 rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex-1">
          <p className="font-bold">📚 By week</p>
          <input
            type="number"
            value={weekInput}
            onChange={(e) => setWeekInput(e.target.value)}
            placeholder="Week number"
            className="mt-1 w-full border-b border-border bg-transparent py-1 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          disabled={!weekInput.trim()}
          onClick={() => onSelect({ kind: "week", weekNumber: Number(weekInput) || 1 })}
          className="h-9 w-9 shrink-0 rounded-full bg-primary text-white disabled:opacity-40"
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex-1">
          <p className="font-bold">🔍 Search a topic</p>
          <input
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            placeholder="e.g. subjunctive mood"
            className="mt-1 w-full border-b border-border bg-transparent py-1 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          disabled={!topicQuery.trim()}
          onClick={() => onSelect({ kind: "topicQuery", query: topicQuery.trim() })}
          className="h-9 w-9 shrink-0 rounded-full bg-primary text-white disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function QuizClient({ subjectId }: { subjectId: string }) {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sourceChunks, setSourceChunks] = useState<Chunk[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [autoHint, setAutoHint] = useState<boolean | null>(null);

  async function handleSelectMode(selected: QuizMode) {
    setMode(selected);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, mode: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Quiz generation failed");
      const data = await res.json();
      setQuestions(data.questions);
      setSourceChunks(data.chunks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetToModePicker() {
    setMode(null);
    setQuestions([]);
    setSourceChunks([]);
    setCurrent(0);
    setAnswer("");
    setRevealed(false);
    setAutoHint(null);
    setError(null);
  }

  async function handleGrade(wasCorrect: boolean) {
    const q = questions[current];
    const chunk = sourceChunks.find((c) => q.sourceChunkIds.includes(c.id));
    const topic = chunk?.topic ?? "general";

    await fetch("/api/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        topic,
        question: q.question,
        correctAnswer: q.answer,
        sourceChunkIds: q.sourceChunkIds,
        userAnswer: answer || null,
        wasCorrect,
      }),
    });

    setAnswer("");
    setRevealed(false);
    setAutoHint(null);
    setCurrent((c) => c + 1);
  }

  if (!mode) return <ModePicker onSelect={handleSelectMode} />;

  if (loading) {
    return <p className="mt-16 text-center text-text-muted">Retrieving your notes and generating questions...</p>;
  }

  if (error) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="text-danger">{error}</p>
        <button onClick={resetToModePicker} className="rounded-xl bg-primary px-6 py-3 font-bold text-white">
          Choose a different mode
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="text-text-muted">No notes matched this mode — try a different one, or add notes first.</p>
        <button onClick={resetToModePicker} className="rounded-xl bg-primary px-6 py-3 font-bold text-white">
          Choose a different mode
        </button>
      </div>
    );
  }

  if (current >= questions.length) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="text-4xl">🏆</p>
        <p className="text-xl font-bold">Nice work — quiz complete!</p>
        <button onClick={resetToModePicker} className="rounded-xl bg-primary px-6 py-3 font-bold text-white">
          🔄 Revise something else
        </button>
      </div>
    );
  }

  const q = questions[current];
  const progressPct = ((current + (revealed ? 0.5 : 0)) / questions.length) * 100;
  const hasAnswer = answer.trim().length > 0;

  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="mb-4 mt-2 text-xs text-text-muted">
        Question {current + 1} of {questions.length}
      </p>

      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <p className="mb-4 text-lg font-bold">{q.question}</p>

        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={revealed}
          placeholder="Your answer"
          className="mb-4 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-bg"
        />

        {!revealed ? (
          <button
            onClick={() => {
              setAutoHint(hasAnswer ? looksCorrect(answer, q.answer) : null);
              setRevealed(true);
            }}
            className="w-full rounded-xl bg-primary py-3 font-bold text-white"
          >
            {hasAnswer ? "✓ Validate answer" : "👁 Reveal answer"}
          </button>
        ) : (
          <>
            {autoHint !== null && (
              <p
                className={`mb-2 inline-block rounded-lg px-3 py-1 text-xs font-semibold ${
                  autoHint ? "bg-green-100 text-success" : "bg-bg text-text-muted"
                }`}
              >
                {autoHint ? "✓ Looks right — compare with the answer below" : "? Doesn't clearly match — check below"}
              </p>
            )}
            <div className="mb-4 rounded-lg bg-primary-soft p-3 text-sm font-semibold text-primary-dark">💡 {q.answer}</div>
            <div className="flex gap-3">
              <button onClick={() => handleGrade(false)} className="flex-1 rounded-xl bg-danger py-3 font-bold text-white">
                ✕ Got it wrong
              </button>
              <button onClick={() => handleGrade(true)} className="flex-1 rounded-xl bg-success py-3 font-bold text-white">
                ✓ Got it right
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
