import { describe, expect, it } from 'vitest';

import { maskEmail, shortEndpoint } from '../src/app/infrastructure/utils/Log';

describe('maskEmail', () => {
    it('keeps the first letter and the domain', () => {
        expect(maskEmail('milo@example.com')).toBe('m***@example.com');
        expect(maskEmail('not-an-email')).toBe('***');
        expect(maskEmail('@odd')).toBe('***');
    });
});

describe('shortEndpoint', () => {
    it('drops the token part of a push endpoint', () => {
        expect(
            shortEndpoint('https://fcm.googleapis.com/fcm/send/dEf4ult:APA91bHlongtokenvalue'),
        ).toBe('fcm.googleapis.com/fcm/send/dE...');
        expect(shortEndpoint('not a url at all but rather long text')).toBe(
            'not a url at all but rat...',
        );
    });
});
