'use client';

import { useQuery } from '@tanstack/react-query';
import { PROFILE } from '@bzim/types';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { isHandleAvailable } from '@/lib/api/users';
import { queryKeys } from '@/lib/query-keys';

export type HandleStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

/** Mirrors the API's rule so the form can say "invalid" without a round trip. */
export function normalizeHandle(raw: string): string {
    return raw.trim().toLowerCase();
}

export function isValidHandle(handle: string): boolean {
    return (
        handle.length >= PROFILE.HANDLE_MIN_LENGTH &&
        handle.length <= PROFILE.HANDLE_MAX_LENGTH &&
        PROFILE.HANDLE_PATTERN.test(handle)
    );
}

/**
 * Live feedback while a handle is typed: the shape is checked locally, the
 * uniqueness is asked of the API once the typing pauses. A handle the person
 * already holds counts as available.
 */
export function useHandleAvailability(raw: string, current: string | null): HandleStatus {
    const handle = normalizeHandle(raw);
    const debounced = useDebouncedValue(handle);
    const valid = isValidHandle(handle);
    const settled = debounced === handle;

    const query = useQuery({
        queryKey: queryKeys.handleAvailable(debounced),
        queryFn: () => isHandleAvailable(debounced),
        enabled: valid && settled && debounced !== current,
        staleTime: 30_000,
    });

    if (handle === '') return 'idle';
    if (!valid) return 'invalid';
    if (handle === current) return 'available';
    if (!settled || query.isPending) return 'checking';
    return query.data === true ? 'available' : 'taken';
}
