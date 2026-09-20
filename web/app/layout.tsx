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
        <header className="bg-gradient-to-br from-primary to-[#9333ea] px-6 py-5 text-white shadow-md">
          <a href="/" className="text-xl font-extrabold tracking-tight">
            ReviseMe
          </a>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
