import { getDatabase } from "@netlify/database";
import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// @netlify/database's getDatabase() picks the right driver for the
// environment automatically:
//  - local `netlify dev`: a plain local Postgres, reached over a normal
//    TCP connection (driver: "server", backed by a `pg.Pool`).
//  - production: real Neon Postgres, reached over Neon's HTTP proxy
//    (driver: "serverless", backed by @neondatabase/serverless).
// These two need different Drizzle adapters — @neondatabase/serverless's
// neon() HTTP client cannot talk to a plain local Postgres at all, which is
// exactly the bug this replaced (client.ts originally hardcoded the
// neon-http driver and always read process.env.NETLIFY_DATABASE_URL
// directly, which isn't even set in the local dev context).
const connection = getDatabase();

export const db =
  connection.driver === "server"
    ? drizzleNodePostgres(connection.pool, { schema })
    : drizzleNeonHttp(connection.httpClient, { schema });
