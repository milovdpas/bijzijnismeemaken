import { describe, expect, it } from 'vitest';
import { GroupRole } from '@bzim/types';

import { GROUP_TABS, activeGroupTab, canSeeTab, groupHref } from './group-navigation';

const ID = '11111111-1111-4111-8111-111111111111';

describe('group navigation', () => {
    it('builds the tab links', () => {
        expect(groupHref(ID)).toBe(`/groups/${ID}`);
        expect(groupHref(ID, 'activities')).toBe(`/groups/${ID}/activities`);
        expect(groupHref(ID, 'members')).toBe(`/groups/${ID}/members`);
    });

    it('finds the active tab, also on a sub-page', () => {
        expect(activeGroupTab(`/groups/${ID}/leaderboards`, ID)).toBe('leaderboards');
        expect(activeGroupTab(`/groups/${ID}/activities/abc`, ID)).toBe('activities');
        expect(activeGroupTab(`/groups/${ID}/tools/darts`, ID)).toBe('tools');
        expect(activeGroupTab(`/groups/${ID}/tournaments/abc/edit`, ID)).toBe('tournaments');
        expect(activeGroupTab(`/groups/${ID}`, ID)).toBe('dashboard');
        expect(activeGroupTab(`/groups/other/members`, ID)).toBeNull();
    });

    it('hides settings from members only', () => {
        const settings = GROUP_TABS.find((item) => item.tab === 'settings');
        const members = GROUP_TABS.find((item) => item.tab === 'members');
        if (settings === undefined || members === undefined) throw new Error('tabs missing');
        expect(canSeeTab(settings, GroupRole.MEMBER)).toBe(false);
        expect(canSeeTab(settings, GroupRole.ADMIN)).toBe(true);
        expect(canSeeTab(settings, GroupRole.OWNER)).toBe(true);
        expect(canSeeTab(members, GroupRole.MEMBER)).toBe(true);
    });
});
