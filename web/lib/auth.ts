import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// No database adapter, no users table — Google's stable account id
// (token.sub) is used directly as the userId that scopes every row in
// Postgres. Requires AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, and AUTH_SECRET
// (see .env.example). trustHost is required on any host other than
// Vercel, which NextAuth doesn't auto-trust by default.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
