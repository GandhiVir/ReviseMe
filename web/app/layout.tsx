import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviseMe",
  description: "Weekly notes, AI-generated revision quizzes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#9333ea] shadow-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <a href="/" className="text-xl font-extrabold tracking-tight text-white">
              ReviseMe
            </a>
            <p className="hidden text-sm text-white/80 sm:block">Weekly notes → AI revision quizzes</p>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
