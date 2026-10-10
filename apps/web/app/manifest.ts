import type { MetadataRoute } from 'next';

import { APP_NAME, APP_TAGLINE } from '@/lib/site';

/**
 * The web app manifest. `id` is frozen at `/` so an installed app survives a
 * change of start URL; `start_url` opens on the groups list, where everyone
 * lands after sign-in anyway. The icons come from `public/icons`, rendered
 * from `app/icon.svg`; the maskable pair keeps the drawing inside the safe
 * zone so Android can crop to any shape.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: '/',
        name: APP_NAME,
        // The same as the full name: the launcher label is the brand, and a launcher
        // that has no room for it shortens it itself.
        short_name: APP_NAME,
        description: APP_TAGLINE,
        start_url: '/groups',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fffdf5',
        theme_color: '#ffc72c',
        lang: 'nl',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
                src: '/icons/maskable-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icons/maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
