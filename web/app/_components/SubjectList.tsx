"use client";

import { useState } from "react";

interface Subject {
  id: string;
  name: string;
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
      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New subject (e.g. Spanish)"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "..." : "+"}
        </button>
      </form>

      {subjects.length === 0 ? (
        <p className="mt-16 text-center text-text-muted">Add a subject above to get started.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {subjects.map((s) => (
            <li key={s.id} className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="mb-3 text-lg font-bold">{s.name}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/subjects/${s.id}/notes`}
                  className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-dark"
                >
                  📝 Add notes
                </a>
                <a
                  href={`/subjects/${s.id}/quiz`}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  🧠 Quiz me
                </a>
                <a
                  href={`/subjects/${s.id}/progress`}
                  className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-dark"
                >
                  📊 Progress
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
