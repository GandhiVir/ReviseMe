import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// NETLIFY_DATABASE_URL is injected automatically by Netlify DB in both
// `netlify dev` and production deploys once `netlify db init` has been run.
const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const db = drizzle(sql, { schema });
