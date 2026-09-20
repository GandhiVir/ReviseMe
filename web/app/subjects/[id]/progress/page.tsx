import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { topicMastery } from "@/lib/db/schema";
import { isDue } from "@/lib/spacedRepetition";

export const dynamic = "force-dynamic";

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(topicMastery).where(eq(topicMastery.subjectId, id));

  if (rows.length === 0) {
    return <p className="mt-16 text-center text-text-muted">No quiz history yet for this subject.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((m) => {
        const due = isDue({ nextDueDate: m.nextDueDate });
        return (
          <div key={m.topic} className="rounded-2xl bg-surface p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-bold">{m.topic}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
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
  );
}
