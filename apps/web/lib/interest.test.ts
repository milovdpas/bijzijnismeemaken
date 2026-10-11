import { describe, expect, it } from 'vitest';
import type { ActivityDetailDto, UserSummary } from '@bzim/types';

import { applyInterest } from './interest';

const anna: UserSummary = { id: 'anna', handle: 'anna', displayName: 'Anna', avatarKey: 'cat' };
const bob: UserSummary = { id: 'bob', handle: 'bob', displayName: 'Bob', avatarKey: 'dog' };

const activity = {
    interests: [anna],
    interestCount: 1,
    iAmIn: false,
} as unknown as ActivityDetailDto;

describe('applyInterest', () => {
    it('adds the viewer and marks them in', () => {
        const next = applyInterest(activity, { userId: 'bob', isMe: true, summary: bob }, true);
        expect(next.interests.map((user) => user.id)).toEqual(['anna', 'bob']);
        expect(next.interestCount).toBe(2);
        expect(next.iAmIn).toBe(true);
    });

    it('removes somebody else without touching the viewer', () => {
        const next = applyInterest(activity, { userId: 'anna', isMe: false, summary: anna }, false);
        expect(next.interests).toEqual([]);
        expect(next.interestCount).toBe(0);
        expect(next.iAmIn).toBe(false);
    });

    it('moves the count alone when the profile is unknown', () => {
        const next = applyInterest(activity, { userId: 'bob', isMe: false, summary: null }, true);
        expect(next.interests).toEqual([anna]);
        expect(next.interestCount).toBe(2);
    });

    it('changes nothing when the state is already what was asked', () => {
        expect(applyInterest(activity, { userId: 'anna', isMe: false, summary: anna }, true)).toBe(
            activity,
        );
    });
});
