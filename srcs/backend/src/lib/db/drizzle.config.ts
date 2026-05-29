import { defineConfig } from "drizzle-kit";
import path from "path";
import { createPoolConfig } from "./src/connection";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const poolConfig = createPoolConfig(process.env.DATABASE_URL);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: poolConfig.ssl,
  },
});
