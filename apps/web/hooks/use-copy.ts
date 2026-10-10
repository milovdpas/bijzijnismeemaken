'use client';

import { useEffect, useState } from 'react';

/**
 * Copies text to the clipboard and reports "copied" for a moment, so a
 * button can flip its label without every caller owning a timer.
 */
export function useCopy(resetMs = 2000): { copied: boolean; copy: (text: string) => void } {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), resetMs);
        return () => clearTimeout(timer);
    }, [copied, resetMs]);

    const copy = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
    };

    return { copied, copy };
}
