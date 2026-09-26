import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-border/60">
        <h1 className="mb-2 text-2xl font-extrabold text-text">ReviseMe</h1>
        <p className="mb-6 text-sm text-text-muted">Sign in to access your subjects and notes.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary-dark"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
