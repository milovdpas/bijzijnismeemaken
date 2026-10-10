import { describe, expect, it } from 'vitest';

import { installMethod, isIos, isStandalone } from './pwa';

describe('pwa', () => {
    it('recognises iOS by its devices', () => {
        expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
        expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
        expect(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false);
    });

    it('knows an installed app from the display mode or the old Safari flag', () => {
        expect(isStandalone((q) => q === '(display-mode: standalone)', undefined)).toBe(true);
        expect(isStandalone(() => false, true)).toBe(true);
        expect(isStandalone(() => false, false)).toBe(false);
    });

    it('prefers the real prompt, then the iOS steps, then the browser menu', () => {
        expect(installMethod(true, true)).toBe('prompt');
        expect(installMethod(false, true)).toBe('ios');
        expect(installMethod(false, false)).toBe('menu');
    });
});
