/** Stash's configuration, from `EXPO_PUBLIC_*` variables (see `.env.example`). */

/** Oxy's API. */
export const OXY_API_URL = process.env.EXPO_PUBLIC_OXY_API_URL ?? 'https://api.oxy.so';

/** Stash's own backend (packages/backend): albums. */
export const STASH_API_URL = process.env.EXPO_PUBLIC_STASH_API_URL ?? 'https://api.stash.oxy.so';

/** Stash's Oxy client id (its ApplicationCredential publicKey). */
export const OXY_CLIENT_ID = process.env.EXPO_PUBLIC_OXY_CLIENT_ID ?? '';
