import { describe, expect, it } from 'vitest';

import { isActiveNav } from './navigation';

describe('isActiveNav', () => {
    it('matches the section and its sub-pages', () => {
        expect(isActiveNav('/groups', '/groups')).toBe(true);
        expect(isActiveNav('/groups/abc/activities', '/groups')).toBe(true);
    });

    it('does not match a sibling that merely shares a prefix', () => {
        expect(isActiveNav('/groupsettings', '/groups')).toBe(false);
        expect(isActiveNav('/settings', '/groups')).toBe(false);
    });
});
