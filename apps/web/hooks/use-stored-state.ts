'use client';

import { useEffect, useState } from 'react';

import { readStored, writeStored } from '@/lib/stored';

/** A change to stored state, always applied to the latest value. */
export type StoredUpdate<T> = (change: (current: T) => T) => void;

/**
 * State that survives a reload on this device: read from local storage once,
 * written back on every change. `parse` decides whether what was stored still
 * fits this version of the app; anything else starts from `initial`. Render
 * it behind `useMounted`, since the server cannot see the stored value.
 */
export function useStoredState<T>(
    key: string,
    parse: (raw: unknown) => T | null,
    initial: T,
): [T, StoredUpdate<T>] {
    const [state, setState] = useState<T>(() => readStored(key, parse) ?? initial);

    useEffect(() => {
        writeStored(key, state);
    }, [key, state]);

    return [state, setState];
}
