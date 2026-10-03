import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Clears Auth.js session cookies (including chunked and __Secure- variants). Used to recover from
// sessions issued before user ids were stable — those have no id and would otherwise bounce to /login forever.
export async function GET(request: Request) {
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (!/^(__Secure-)?authjs\.session-token/.test(name)) continue;
    jar.set(name, "", { maxAge: 0, path: "/", secure: name.startsWith("__Secure-") });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
