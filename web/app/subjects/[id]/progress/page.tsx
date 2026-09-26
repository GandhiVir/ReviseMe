import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subjects, topicMastery } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";
import { isDue } from "@/lib/spacedRepetition";
import PageHeader from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, userId))).limit(1);
  const rows = await db.select().from(topicMastery).where(eq(topicMastery.subjectId, id));

  return (
    <div>
      <PageHeader title="Progress" subtitle={subject ? subject.name : undefined} />

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-4xl">📊</p>
          <p className="text-text-muted">No quiz history yet for this subject.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => {
            const due = isDue({ nextDueDate: m.nextDueDate });
            return (
              <div key={m.topic} className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border/60">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-bold">{m.topic}</p>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      due ? "bg-red-100 text-danger" : "bg-green-100 text-success"
                    }`}
                  >
                    {due ? "⚠ Due" : "✓ On track"}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {due ? "Ready for review now" : `Next review: ${m.nextDueDate.toLocaleDateString()}`}
                </p>
                <p className="mt-2 text-xs font-semibold">🔥 {m.correctStreak} correct in a row</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
