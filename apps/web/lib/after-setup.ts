import { safeReturnTo } from './return-to';
import { isRecord } from './tools/guards';
import { readStored, removeStored, writeStored } from './stored';

const KEY = 'bzim.afterSetup';

/** A day: time to verify an email and finish onboarding, not long enough to surprise later. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Where somebody was going when signing in took them away, an invite link
 * mostly. A new account goes through onboarding and the welcome steps
 * first, and an emailed verification link may open in another tab, so the
 * place is kept on the device rather than carried in the address. The
 * groups page is where everybody ends up anyway, so it is not kept.
 */
export function rememberDestination(path: string, now = Date.now()): void {
    const safe = safeReturnTo(path);
    if (safe === undefined || safe === '/' || safe === '/groups') return;
    writeStored(KEY, { path: safe, at: now });
}

/** The remembered place, once: taking it forgets it. Null when there is none. */
export function takeDestination(now = Date.now()): string | null {
    const path = readStored(KEY, (raw) => storedDestination(raw, now));
    removeStored(KEY);
    return path;
}

/** A stored place read back: a safe in-app path younger than a day, else null. */
export function storedDestination(raw: unknown, now: number): string | null {
    if (!isRecord(raw)) return null;
    const { path, at } = raw;
    if (typeof path !== 'string' || typeof at !== 'number') return null;
    if (now - at > MAX_AGE_MS || at > now) return null;
    return safeReturnTo(path) ?? null;
}
