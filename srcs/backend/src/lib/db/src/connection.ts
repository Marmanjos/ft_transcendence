import type { PoolConfig } from "pg";

function shouldEnableSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.hostname.endsWith(".supabase.co") || url.searchParams.get("sslmode") === "require";
  } catch {
    return connectionString.includes(".supabase.co") || connectionString.includes("sslmode=require");
  }
}

export function createPoolConfig(connectionString: string): PoolConfig {
  const config: PoolConfig = {
    connectionString,
  };

  if (shouldEnableSsl(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}