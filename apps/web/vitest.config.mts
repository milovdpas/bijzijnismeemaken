import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('.', import.meta.url)),
        },
    },
    test: {
        // Node only: everything under test is pure. Component tests would need
        // i18n, TanStack Query and Base UI portals and would cost more than the
        // suite is worth for now; see docs/09-frontend-conventions.md.
        environment: 'node',
        include: ['lib/**/*.test.ts', 'store/**/*.test.ts', 'hooks/**/*.test.ts'],
    },
});
