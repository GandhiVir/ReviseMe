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
      <p className="mb-6 text-sm text-text-muted">Pick a subject to add notes or start a revision quiz.</p>
      <SubjectList initialSubjects={rows.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
