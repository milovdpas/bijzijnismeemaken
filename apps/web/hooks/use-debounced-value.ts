'use client';

import { useEffect, useState } from 'react';

/**
 * The value as it was `delayMs` ago, so a request keyed on it fires once the
 * typing pauses rather than on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
