import { auth } from "./auth";

/**
 * Returns the signed-in user's stable Google account id, used to scope
 * every row in Postgres. Middleware already redirects unauthenticated
 * visitors to /login before any page or API route runs, so this should
 * never actually be null in practice — the error is a defensive check,
 * not an expected path.
 */
export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No authenticated session — middleware.ts should have redirected to /login before this ran.");
  }
  return session.user.id;
}
