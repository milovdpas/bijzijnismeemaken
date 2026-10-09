import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';

/**
 * Read at build time and inlined into the client bundle, so the settings page
 * can say which build a phone is actually running. Importing package.json
 * instead would bundle the whole dependency list with it.
 */
const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

const nextConfig: NextConfig = {
    env: { NEXT_PUBLIC_APP_VERSION: version },

    /**
     * Emit a self-contained server bundle in `.next/standalone`, so the runtime
     * image can drop `node_modules` entirely. Required by the Dockerfile.
     */
    output: 'standalone',

    /**
     * The shared package is consumed through the workspace symlink as compiled
     * CommonJS. Transpiling it lets Next tree-shake the enums and constants the
     * same way it does the app's own modules.
     */
    transpilePackages: ['@bzim/types'],

    /**
     * The root has no page of its own: the app lives under `(app)`. Declared
     * here rather than as a page calling `redirect()` so nothing is rendered or
     * bundled for it. Temporary (307) because a signed-out landing page may
     * claim `/` later.
     */
    async redirects() {
        return [{ source: '/', destination: '/groups', permanent: false }];
    },
};

export default nextConfig;
