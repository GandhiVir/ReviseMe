import type { Metadata } from "next";
import "./globals.css";
import Mascot from "./_components/Mascot";
import ThemeToggle from "./_components/ThemeToggle";
import { auth, signOut } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ReviseMe",
  description: "Weekly notes, AI-generated revision quizzes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(!t)t="dark";document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#9333ea] shadow-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white">
              <Mascot mood="feisty" className="h-9 w-9" />
              ReviseMe
            </a>
            <div className="flex items-center gap-3">
              {session?.user && (
                <>
                  <span className="hidden text-sm text-white/80 sm:block">{session.user.email}</span>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/login" });
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
