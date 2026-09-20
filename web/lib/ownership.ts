import { and, eq } from "drizzle-orm";
import { db } from "./db/client";
import { subjects } from "./db/schema";

/** Confirms subjectId belongs to userId — subject ids are random UUIDs, but
 * this still stops one visitor's session from reading/writing another's data
 * by guessing or replaying an id. */
export async function assertSubjectOwnership(subjectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .limit(1);
  return !!row;
}
