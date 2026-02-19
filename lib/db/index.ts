import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbClient = PostgresJsDatabase<typeof schema>;

let dbInstance: DbClient | null = null;

function createDbClient(): DbClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Disable prefetch as it's not supported for "Transaction" pool mode
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

function getDbClient(): DbClient {
  if (!dbInstance) {
    dbInstance = createDbClient();
  }

  return dbInstance;
}

// Lazily initialize the DB so module import during build does not require DATABASE_URL.
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    const instance = getDbClient();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
