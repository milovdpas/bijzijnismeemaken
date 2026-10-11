import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every `t("...")` in the app resolves to a key that exists.
 *
 * `Dict` already makes a key present in `en.ts` and missing from `nl.ts` a
 * compile error, but nothing checks the other direction: `t()` takes a plain
 * string, so a typo or a key that was never added renders as **the key itself**
 * and ships.
 *
 * Source is scanned rather than imported, because the check is about what the
 * components ask for and only the call sites know that.
 */
function definedKeys(): Set<string> {
    const src = readFileSync('lib/i18n/locales/en.ts', 'utf8');
    const keys = new Set<string>();
    let stack: string[] = [];
    const indent = 4;

    for (const line of src.split('\n')) {
        const open = /^(\s+)(?:([A-Za-z_][\w-]*)|'([^']+)'): \{/.exec(line);
        if (open) {
            stack = stack.slice(0, (open[1] ?? '').length / indent - 1);
            stack.push(open[2] ?? open[3] ?? '');
            continue;
        }
        const leaf = /^(\s+)(?:([A-Za-z_][\w-]*)|'([^']+)'):/.exec(line);
        if (leaf) {
            const depth = (leaf[1] ?? '').length / indent - 1;
            keys.add([...stack.slice(0, depth), leaf[2] ?? leaf[3] ?? ''].join('.'));
        }
        const close = /^(\s*)\},?$/.exec(line);
        if (close) stack = stack.slice(0, (close[1] ?? '').length / indent - 1);
    }
    return keys;
}

/** Every .ts/.tsx source file under a root, tests excluded. */
function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

function usedKeys(): string[] {
    // A plain walk rather than shelling out to grep: this has to run wherever
    // `npm test` runs, and grep is not on PATH on Windows.
    const found = new Set<string>();
    for (const root of ['components', 'hooks', 'app', 'lib']) {
        for (const file of sourceFiles(root)) {
            const src = readFileSync(file, 'utf8');
            for (const m of src.matchAll(/\bt\('([a-zA-Z][\w.-]+)'/g)) {
                found.add(m[1] ?? '');
            }
            // PageHeader and EmptyState take keys as props; registries (tabs, tools,
            // palettes) name them as properties.
            for (const m of src.matchAll(
                /(?:titleKey|subtitleKey|descriptionKey|labelKey)(?:=|:\s*)['"]([a-zA-Z][\w.-]+)['"]/g,
            )) {
                found.add(m[1] ?? '');
            }
        }
    }
    return [...found];
}

describe('translation keys', () => {
    it('every key the app asks for is defined', () => {
        const defined = definedKeys();
        const missing = usedKeys().filter(
            (key) =>
                // Plurals live under `_one` / `_other`; i18next resolves the base name.
                !defined.has(key) && !defined.has(`${key}_one`) && !defined.has(`${key}_other`),
        );
        expect(missing).toEqual([]);
    });

    it('finds the keys it is supposed to find, so an empty pass means something', () => {
        // Guards the guard. If either scanner silently matched nothing, the test
        // above would pass while checking precisely nothing.
        const defined = definedKeys();
        expect(defined.size).toBeGreaterThan(20);
        expect(defined.has('common.save')).toBe(true);
        expect(defined.has('status.ok')).toBe(true);
        expect(usedKeys().length).toBeGreaterThan(3);
    });
});

describe('screen-reader labels', () => {
    it('are translated, not hardcoded English', () => {
        // The check above only sees `t('...')`, so it cannot catch a label written
        // as a plain string. `aria-label` is the commonest place that happens,
        // because nothing on screen looks wrong: a Dutch user with a screen
        // reader simply hears English.
        const offenders: string[] = [];
        for (const root of ['components', 'app']) {
            for (const file of sourceFiles(root)) {
                if (file.includes(join('components', 'ui'))) continue;
                const src = readFileSync(file, 'utf8');
                for (const m of src.matchAll(/aria-label="([^"]*)"/g)) {
                    offenders.push(`${file}: ${m[1] ?? ''}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
