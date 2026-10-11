import { describe, expect, it } from 'vitest';

import { applicationServerKey, describeDevice, pushSupport } from './push';

const ALL = {
    serviceWorker: true,
    pushManager: true,
    notification: true,
    ios: false,
    standalone: false,
};

describe('pushSupport', () => {
    it('is fine in a capable browser', () => {
        expect(pushSupport(ALL)).toBe('ok');
    });

    it('asks iOS to install first, even when the APIs are missing', () => {
        expect(pushSupport({ ...ALL, ios: true, pushManager: false })).toBe('needs-install');
        expect(pushSupport({ ...ALL, ios: true, standalone: true })).toBe('ok');
    });

    it('gives up without a service worker, push manager or Notification', () => {
        expect(pushSupport({ ...ALL, serviceWorker: false })).toBe('unsupported');
        expect(pushSupport({ ...ALL, pushManager: false })).toBe('unsupported');
        expect(pushSupport({ ...ALL, notification: false })).toBe('unsupported');
    });
});

describe('applicationServerKey', () => {
    it('decodes base64url, padding included', () => {
        // "hello?" in base64url is aGVsbG8_ (base64 would be aGVsbG8/).
        expect(Array.from(applicationServerKey('aGVsbG8_'))).toEqual([104, 101, 108, 108, 111, 63]);
        expect(Array.from(applicationServerKey('aGk'))).toEqual([104, 105]);
    });
});

describe('describeDevice', () => {
    it('names the browser and the device', () => {
        expect(
            describeDevice(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            ),
        ).toBe('Safari · iPhone');
        expect(
            describeDevice(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            ),
        ).toBe('Edge · Windows');
        expect(
            describeDevice(
                'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            ),
        ).toBe('Chrome · Android');
    });

    it('is empty when nothing was recorded', () => {
        expect(describeDevice(null)).toBe('');
        expect(describeDevice('curl/8.0')).toBe('');
    });
});
