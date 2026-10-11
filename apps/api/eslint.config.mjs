import globals from 'globals';

import { baseConfig, ignores } from '../../eslint.config.base.mjs';

/**
 * The API adds Node globals and one exception.
 *
 * Everything else comes from the shared base, which is where the rules that
 * apply to the app as well are declared.
 */
export default [
    ignores,
    {
        // Outside the TypeScript program on purpose: it is ESM and the app
        // compiles as CommonJS, so a type-aware pass cannot parse it.
        ignores: ['vitest.config.ts'],
    },
    ...baseConfig,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            /**
             * Logging is how a server says anything at all.
             *
             * There is no reporting service yet, so `console` is the only place
             * a rate limit or a failed migration is visible. When one arrives
             * this becomes a restriction rather than a permission.
             */
            'no-console': 'off',
        },
    },
    {
        /**
         * The layers depend inward only.
         *
         * `http` (routes, controllers, middleware, validators, response helpers)
         * uses the domain and the infrastructure; neither of those reaches back
         * into it, so a service never learns about requests or responses.
         */
        files: ['src/app/domain/**/*.ts', 'src/app/infrastructure/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['**/http/**'],
                            message: 'The domain and infrastructure do not import from http.',
                        },
                    ],
                },
            ],
        },
    },
];
