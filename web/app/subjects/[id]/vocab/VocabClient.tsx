"use client";

import { useMemo, useState } from "react";
import type { VocabEntry } from "@/lib/vocab";
import Mascot from "../../../_components/Mascot";

interface OtherNote {
  topic: string;
  weekNumber: number;
  lines: string[];
}

export default function VocabClient({ entries, other }: { entries: VocabEntry[]; other: OtherNote[] }) {
  const [query, setQuery] = useState("");
  const [week, setWeek] = useState<number | "all">("all");

  const weeks = useMemo(() => [...new Set(entries.map((e) => e.weekNumber))].sort((a, b) => a - b), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (week !== "all" && e.weekNumber !== week) return false;
      if (!q) return true;
      return [e.original, e.pronunciation, e.translation, e.topic].some((f) => f.toLowerCase().includes(q));
    });
  }, [entries, query, week]);

  if (entries.length === 0 && other.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-2 text-center">
        <Mascot mood="feisty" className="mb-2 h-16 w-16" />
        <p className="text-text-muted">No notes yet — add some and your vocabulary will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {entries.length > 0 && (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search words, meanings, topics…"
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
            >
              <option value="all">All weeks</option>
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>

          <p className="mb-2 text-xs text-text-muted">
            {filtered.length} of {entries.length} words
          </p>

          <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-primary-soft text-xs uppercase tracking-wide text-on-soft">
                <tr>
                  <th className="px-4 py-3">Word</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Pronunciation</th>
                  <th className="px-4 py-3">Meaning</th>
                  <th className="hidden px-4 py-3 md:table-cell">Topic</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-4 py-3 font-bold">{e.original}</td>
                    <td className="hidden px-4 py-3 text-text-muted sm:table-cell">{e.pronunciation || "—"}</td>
                    <td className="px-4 py-3">{e.translation}</td>
                    <td className="hidden px-4 py-3 text-xs text-text-muted md:table-cell">
                      {e.topic} · wk {e.weekNumber}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                      Nothing matches that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {other.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Other notes</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {other.map((o, i) => (
              <div key={i} className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border/60">
                <p className="mb-2 text-xs font-semibold text-text-muted">
                  {o.topic} · week {o.weekNumber}
                </p>
                <p className="whitespace-pre-wrap text-sm">{o.lines.join("\n")}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
