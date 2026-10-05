import { defineConfig } from "drizzle-kit";

// Reads the Postgres connection string from the environment so the same config
// works locally, in CI, and on Vercel — no credentials committed.
//   DATABASE_URL=postgresql://... drizzle-kit push
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
