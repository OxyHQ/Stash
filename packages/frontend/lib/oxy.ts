import { OxyServices } from '@oxy.so/core';
import { OXY_API_URL } from '@/lib/config';

/**
 * Stash's one Oxy client. `OxyProvider` is handed this instance, so the session
 * it signs in, restores and refreshes is the one Stash's backend client and
 * every Oxy Files call read.
 *
 * `enableCache: false`: React Query owns caching.
 */
export const oxyServices = new OxyServices({ baseURL: OXY_API_URL, enableCache: false });
