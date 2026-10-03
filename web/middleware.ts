import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Replaces the old anonymous-cookie middleware entirely now that there's
// real login — unauthenticated visitors get redirected to /login instead
// of silently getting a random per-browser id.
export default auth((req) => {
  // Sessions issued before userId existed have no stable id; treat them as signed out so they re-login.
  const isLoggedIn = !!req.auth?.user?.id;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/api/auth") || req.nextUrl.pathname.startsWith("/api/demo-login");

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
