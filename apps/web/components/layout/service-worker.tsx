'use client';

import { useEffect } from 'react';

/**
 * Registers `public/sw.js` once the page has loaded, in production only: in
 * development a worker caching Next's dev bundles is a reliable way to
 * debug the wrong code for an hour. Renders nothing.
 */
export function ServiceWorker() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
        const register = () => {
            navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
                console.warn('Service worker registration failed', error);
            });
        };
        if (document.readyState === 'complete') {
            register();
            return;
        }
        window.addEventListener('load', register, { once: true });
        return () => window.removeEventListener('load', register);
    }, []);

    return null;
}
