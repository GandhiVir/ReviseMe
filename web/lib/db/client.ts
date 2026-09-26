import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// A self-provisioned free Neon project (neon.tech), not Netlify's own
// managed database product — that one requires a paid "Credit-based" plan
// (confirmed via a 403 "database feature not available for this account"
// on first deploy attempt). Same underlying Postgres/Neon technology,
// just provisioned directly instead of through Netlify's paywall.
// DATABASE_URL is set manually via `netlify env:set` (production) and in
// a local .env file (dev) — see README.md.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
