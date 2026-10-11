'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';

/**
 * The one toast stack, mounted by `AppRuntime`. Follows the colour scheme
 * next-themes resolved, and sits above the dialog overlay (`--z-toast`).
 */
export function Toaster(props: ToasterProps) {
    const { theme = 'system' } = useTheme();

    return (
        <Sonner
            theme={theme as ToasterProps['theme']}
            position="top-center"
            closeButton
            richColors
            style={{ zIndex: 'var(--z-toast)' }}
            toastOptions={{ classNames: { toast: 'rounded-2xl font-sans' } }}
            {...props}
        />
    );
}
