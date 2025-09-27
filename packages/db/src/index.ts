import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  // Log an error, but don't throw, to allow Vercel env vars to work
  console.error(
    '🔴 DATABASE_URL environment variable is not set in the runtime environment.',
  );
}

const isProduction = process.env.NODE_ENV === 'production';
const sslSetting = isProduction ? ('require' as const) : undefined;

const connectionOptions: postgres.Options<
  Record<string, postgres.PostgresType>
> = {
  // Optimize connection pooling for auth performance
  max: isProduction ? 20 : 5, // More connections in production
  idle_timeout: 30, // Close idle connections after 30s
  connect_timeout: 10, // Fail fast on connection issues
  prepare: false, // Disable prepared statements for faster auth queries
  // Only require SSL in production, allow non-SSL for local dev/other environments
  ssl: sslSetting,
};


// Create the connection pool
// Use process.env.DATABASE_URL or a default dummy URL if not set
const queryClient = postgres(
  process.env.DATABASE_URL || 'postgresql://invalid:invalid@invalid/invalid',
  connectionOptions,
);

// Create the Drizzle instance
export const db = drizzle(queryClient, {
  schema,
  logger: false, // Disable logger to reduce console noise
});

// Re-export the schema for easy imports in the app
export * from './schema';
