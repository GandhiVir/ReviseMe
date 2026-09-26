import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, ONE_YEAR_SECONDS } from "@/lib/session";

// Middleware is one of the few places Next.js allows setting cookies (the
// others are Server Actions and Route Handlers — a plain Server Component's
// render is read-only). Ensuring the anonymous id exists here, before any
// page or API route runs, means lib/session.ts's getUserId() never needs to
// write a cookie itself — it can just read one that's already guaranteed
// to be there.
export function middleware(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)) return NextResponse.next();

  const response = NextResponse.next();
  // crypto.randomUUID() is the Web Crypto API (a global, not Node's
  // "crypto" module) — the one that's actually available in the Edge
  // Runtime middleware runs on by default.
  response.cookies.set(COOKIE_NAME, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
