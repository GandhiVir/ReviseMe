import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Local-only demo login for taking README screenshots: needs both `next dev`
// (NODE_ENV === "development") and DEMO_MODE=1, so it never exists in a build.
export const DEMO_ENABLED = process.env.NODE_ENV === "development" && process.env.DEMO_MODE === "1";
export const DEMO_USER_ID = "demo-local";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    ...(DEMO_ENABLED
      ? [
          Credentials({
            id: "demo",
            credentials: {},
            authorize: async () => ({ id: DEMO_USER_ID, email: "demo@reviseme.local", name: "Demo" }),
          }),
        ]
      : []),
  ],
  trustHost: true,
  callbacks: {
    // Without a DB adapter, Auth.js assigns a fresh random UUID as `token.sub` on every
    // sign-in, so it can't key stored data. The provider's own stable account id
    // (Google's `sub`) is `account.providerAccountId`, available only at sign-in time.
    jwt({ token, account }) {
      if (account) token.userId = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
