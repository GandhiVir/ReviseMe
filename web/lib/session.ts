import { cookies } from "next/headers";

export const COOKIE_NAME = "reviseme_uid";
export const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Reads the anonymous per-browser id used to scope all data. The cookie
 * itself is created in middleware.ts (one of the few places Next.js allows
 * setting cookies — a Server Component's render, unlike middleware, a
 * Server Action, or a Route Handler, is read-only), so by the time any
 * page or API route calls this, the cookie is guaranteed to already exist.
 */
export async function getUserId(): Promise<string> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) {
    throw new Error(
      "reviseme_uid cookie is missing — middleware.ts should have set it on every request. Check middleware.ts's matcher config."
    );
  }
  return id;
}
