import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subjects } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";
import SubjectList from "./_components/SubjectList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getUserId();
  const rows = await db.select().from(subjects).where(eq(subjects.userId, userId)).orderBy(desc(subjects.createdAt));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text sm:text-3xl">Your subjects</h1>
        <p className="mt-1 text-sm text-text-muted">Pick a subject to add notes or start a revision quiz.</p>
      </div>
      <SubjectList initialSubjects={rows.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
