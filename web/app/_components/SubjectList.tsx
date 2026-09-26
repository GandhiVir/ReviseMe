"use client";

import { useState } from "react";

interface Subject {
  id: string;
  name: string;
}

const ICONS = ["📘", "🧪", "🗣️", "🎨", "📐", "🌍", "🎵", "💻"];
function iconFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ICONS[hash % ICONS.length];
}

export default function SubjectList({ initialSubjects }: { initialSubjects: Subject[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const subject = await res.json();
      setSubjects((prev) => [subject, ...prev]);
      setNewName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-8 flex max-w-md gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New subject (e.g. Spanish)"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-dark hover:shadow disabled:opacity-50"
        >
          {saving ? "…" : "+ Add"}
        </button>
      </form>

      {subjects.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-4xl">✨</p>
          <p className="text-text-muted">Add a subject above to get started.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="group rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-xl">
                  {iconFor(s.name)}
                </div>
                <p className="text-lg font-bold text-text">{s.name}</p>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={`/subjects/${s.id}/quiz`}
                  className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  🧠 Quiz me
                </a>
                <div className="flex gap-2">
                  <a
                    href={`/subjects/${s.id}/notes`}
                    className="flex-1 rounded-xl bg-primary-soft px-4 py-2.5 text-center text-sm font-semibold text-primary-dark transition hover:bg-primary/20"
                  >
                    📝 Add notes
                  </a>
                  <a
                    href={`/subjects/${s.id}/progress`}
                    className="flex-1 rounded-xl bg-primary-soft px-4 py-2.5 text-center text-sm font-semibold text-primary-dark transition hover:bg-primary/20"
                  >
                    📊 Progress
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
