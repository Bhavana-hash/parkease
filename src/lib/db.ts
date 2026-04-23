import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const client = postgres(databaseUrl, {
  prepare: false,
  max: 10,
});

export const db = drizzle(client);
