/**
 * This device's local storage, for state that has to survive a reload (the
 * tools, and where a new account was going before onboarding). Every access is guarded: storage can be switched off or full, and
 * there is none on the server; then the app carries on in memory.
 */

export function readStored<T>(key: string, parse: (raw: unknown) => T | null): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? null : parse(JSON.parse(raw));
    } catch {
        return null;
    }
}

export function writeStored(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Full or switched off: the game goes on in memory for this visit.
    }
}

export function removeStored(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Switched off: there was nothing to remove.
    }
}
