import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __tradefortPool?: Pool;
};

// IMPORTANT: do NOT throw at module load when DATABASE_URL is missing.
// `next build`'s "Collecting page data" phase imports every route module (and
// therefore this file) at build time, when DATABASE_URL is not guaranteed to be
// present. Throwing here fails the build with `Error: DATABASE_URL is required`
// before any request is ever served. pg.Pool is lazy — constructing it does not
// open a connection, it only connects on the first query. So we create the Pool
// unconditionally; the runtime MUST have DATABASE_URL set, and without it the
// first query will fail with a clear connection error.
function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new Pool({ connectionString: url });
  }
  // Build-time / misconfigured: a Pool that will fail loudly on first use rather
  // than crashing the build.
  return new Pool({});
}

export const pool =
  globalForDb.__tradefortPool ?? (globalForDb.__tradefortPool = createPool());

if (process.env.NODE_ENV !== "production") {
  globalForDb.__tradefortPool = pool;
}

export const db = drizzle(pool, { schema });
