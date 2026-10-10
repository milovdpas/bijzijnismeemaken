import { describe, expect, it } from 'vitest';

import { inviteTokenFromSegment } from './invite-link';

const TOKEN = 'abcDEF123-_xyz456789ABCDEFGHIJKLMNOPQRSTUVW'; // 43 characters

describe('inviteTokenFromSegment', () => {
    it('takes the last 43 characters, whatever the slug looks like', () => {
        expect(inviteTokenFromSegment(`kaart-avond-${TOKEN}`)).toBe(TOKEN);
        expect(inviteTokenFromSegment(`-${TOKEN}`)).toBe(TOKEN);
    });

    it('accepts a bare token', () => {
        expect(inviteTokenFromSegment(TOKEN)).toBe(TOKEN);
    });

    it('rejects segments that are too short or hold other characters', () => {
        expect(inviteTokenFromSegment('kaartavond')).toBeNull();
        expect(inviteTokenFromSegment(TOKEN.slice(1))).toBeNull();
        expect(inviteTokenFromSegment(`kaart-avond-${TOKEN.slice(0, 42)}.`)).toBeNull();
    });
});
