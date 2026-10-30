/**
 * Where the SQL migrations live — ONE constant, because two things read it:
 * `db/migrate.ts` applies the folder, and `db/postgres.ts` reads the same
 * folder's journal to decide whether a task may serve traffic (`GET /ready`).
 * If the two disagreed, readiness would assert against a journal nobody
 * applies, and pass.
 *
 * A fixed depth is right here: Bun runs this file from `src/db/` in development
 * and in the image alike (there is no compiled `dist/`).
 */

import { join } from 'node:path';

export const MIGRATIONS_FOLDER = join(import.meta.dir, '..', '..', 'drizzle');
