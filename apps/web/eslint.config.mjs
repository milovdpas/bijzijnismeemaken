import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * The web app uses Next's own presets rather than the repo's type-aware base:
 * they carry the React, hooks and JSX rules that matter here, and the
 * type-aware pass would need a separate program for every route file.
 */
const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            // Allow the "omit one property" idiom: `const { kind, ...rest } = x`.
            '@typescript-eslint/no-unused-vars': [
                'error',
                { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
        },
    },
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/sw.js']),
]);

export default eslintConfig;
