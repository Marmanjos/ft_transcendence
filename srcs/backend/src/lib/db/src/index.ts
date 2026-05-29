import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createPoolConfig } from "./connection";
import * as schema from "./schema";

const { Pool } = pg;

function createMissingDatabaseProxy(): NodePgDatabase<typeof schema> {
  const error = new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );

  return new Proxy(
    {},
    {
      get() {
        throw error;
      },
      apply() {
        throw error;
      },
    },
  ) as unknown as NodePgDatabase<typeof schema>;
}

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? new Pool(createPoolConfig(databaseUrl))
  : null;
export const db: NodePgDatabase<typeof schema> = pool
  ? drizzle(pool, { schema })
  : createMissingDatabaseProxy();

export * from "./schema";
