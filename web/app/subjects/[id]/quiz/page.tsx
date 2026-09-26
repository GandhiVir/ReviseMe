import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subjects } from "@/lib/db/schema";
import { getUserId } from "@/lib/session";
import PageHeader from "../../../_components/PageHeader";
import QuizClient from "./QuizClient";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, userId))).limit(1);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Revision quiz" subtitle={subject ? subject.name : undefined} />
      <QuizClient subjectId={id} />
    </div>
  );
}
