import { NextResponse } from "next/server";
import { DEMO_ENABLED, signIn } from "@/lib/auth";

export async function GET() {
  if (!DEMO_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return signIn("demo", { redirectTo: "/" });
}
