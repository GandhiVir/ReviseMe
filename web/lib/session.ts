import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "reviseme_uid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Gets (or creates) the anonymous per-browser id used to scope all data. */
export async function getUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return id;
}
