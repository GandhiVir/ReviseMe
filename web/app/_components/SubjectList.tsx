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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setConfirmingId(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
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
                <p className="min-w-0 flex-1 truncate text-lg font-bold text-text">{s.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmingId(confirmingId === s.id ? null : s.id);
                  }}
                  aria-label={`Delete ${s.name}`}
                  title="Delete subject"
                  className="shrink-0 rounded-lg px-2 py-1 text-sm text-text-muted transition hover:bg-red-100 hover:text-danger"
                >
                  🗑
                </button>
              </div>
              {confirmingId === s.id && (
                <div className="mb-4 rounded-xl border border-danger/40 bg-red-100 p-3 text-sm">
                  <p className="mb-2 font-semibold text-danger">Delete "{s.name}" and all its notes, vocab and progress? This can't be undone.</p>
                  {deleteError && <p className="mb-2 text-xs text-danger">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      className="flex-1 rounded-lg bg-danger py-2 text-xs font-bold text-white transition hover:brightness-95 disabled:opacity-50"
                    >
                      {deletingId === s.id ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === s.id}
                      onClick={() => setConfirmingId(null)}
                      className="flex-1 rounded-lg bg-surface py-2 text-xs font-bold text-text ring-1 ring-border transition hover:bg-bg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <a
                  href={`/subjects/${s.id}/quiz`}
                  className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  🧠 Quiz me
                </a>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`/subjects/${s.id}/notes`}
                    className="flex flex-col items-center gap-1 rounded-xl bg-primary-soft px-2 py-3 text-center text-xs font-semibold text-on-soft transition hover:bg-primary/20"
                  >
                    <span className="text-lg leading-none">📝</span>
                    Add Notes
                  </a>
                  <a
                    href={`/subjects/${s.id}/vocab`}
                    className="flex flex-col items-center gap-1 rounded-xl bg-primary-soft px-2 py-3 text-center text-xs font-semibold text-on-soft transition hover:bg-primary/20"
                  >
                    <span className="text-lg leading-none">📖</span>
                    Vocab
                  </a>
                  <a
                    href={`/subjects/${s.id}/progress`}
                    className="flex flex-col items-center gap-1 rounded-xl bg-primary-soft px-2 py-3 text-center text-xs font-semibold text-on-soft transition hover:bg-primary/20"
                  >
                    <span className="text-lg leading-none">📊</span>
                    Progress
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
