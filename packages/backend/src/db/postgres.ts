/**
 * PostgreSQL connection — Drizzle ORM over postgres.js
 * (`drizzle-orm/postgres-js`), built through `@oxy.so/db`'s `createDatabase()`
 * exactly as Willo and Mention do. Connect once at
 * boot (`connectPostgres`), then read the handle synchronously from anywhere
 * via `getDb()`.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { createDatabase } from '@oxy.so/db';
import { assertPostgresMigrationsCurrent, readJournal } from '@oxy.so/db/migrate';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MIGRATIONS_FOLDER } from './migrationsFolder';
import * as schema from './schema';

/** Seconds `closePostgres` waits for in-flight queries before forcing the socket shut. */
const CLOSE_TIMEOUT_SECONDS = 5;

/**
 * The migration journal this build ships, read once: it is files inside the
 * image and cannot change while the process runs.
 */
const JOURNAL = readJournal(MIGRATIONS_FOLDER);

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | null = null;
let client: postgres.Sql | null = null;

/**
 * Open the connection pool. Call once during startup, before serving
 * traffic. Idempotent: a second call returns the existing handle rather than
 * opening a second pool.
 */
export async function connectPostgres(): Promise<Database> {
  if (db) return db;

  // `createDatabase` guarantees this handle is built with `DATABASE_CASING`,
  // matching what `drizzle.config.ts` used to generate the migrations —
  // otherwise queries would reference columns the migrations never created.
  const created = createDatabase({
    databaseUrl: config.databaseUrl,
    schema,
  });

  // postgres.js connects lazily, so constructing the pool proves nothing.
  // Issue a real round trip so an unreachable/misconfigured database fails
  // during startup instead of on the first request.
  try {
    await created.client`select 1`;
  } catch (error) {
    await created.client.end({ timeout: CLOSE_TIMEOUT_SECONDS });
    throw error;
  }

  client = created.client;
  db = created.db;
  return db;
}

/**
 * The connection opened by `connectPostgres()`.
 *
 * @throws {Error} If called before `connectPostgres()` resolved — a
 *   programming error, not a runtime condition to recover from.
 */
export function getDb(): Database {
  if (!db) {
    throw new Error(
      'PostgreSQL is not connected. Call connectPostgres() during startup before issuing queries.',
    );
  }
  return db;
}

/**
 * Whether the database answers a trivial query right now — half of
 * `GET /ready`. A real round trip: a pool can exist while the server behind it
 * is unreachable. Never throws; an unreachable database is a result.
 */
export async function checkPostgresHealth(): Promise<boolean> {
  const instanceClient = client;
  if (!instanceClient) return false;
  try {
    await instanceClient`select 1`;
    return true;
  } catch (error) {
    logger.error('Postgres health check failed', error);
    return false;
  }
}

/**
 * Whether this build's migrations have all been applied — the other half of
 * `GET /ready`. A task whose database is behind the schema it was built
 * against still starts and connects, then fails every query; it must not be
 * able to say it is ready.
 *
 * @throws {Error} When the database is behind this build, or the ledger cannot
 *   be read.
 */
export async function assertMigrationsCurrent(): Promise<void> {
  const instanceClient = client;
  if (!instanceClient) {
    throw new Error('PostgreSQL is not connected. Call connectPostgres() during startup.');
  }
  await assertPostgresMigrationsCurrent(instanceClient, JOURNAL);
}

/** Close the pool (for shutdown hooks and test teardown). Safe to call when never connected. */
export async function closePostgres(): Promise<void> {
  const instanceClient = client;
  if (!instanceClient) return;
  client = null;
  db = null;
  await instanceClient.end({ timeout: CLOSE_TIMEOUT_SECONDS });
}
