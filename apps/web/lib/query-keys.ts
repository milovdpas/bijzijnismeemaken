/**
 * Every TanStack Query key, in one place.
 *
 * Keys are arrays so invalidation can target a prefix: invalidating
 * `queryKeys.groups.all` drops every group list and detail at once. Each task
 * that adds a resource adds its keys here rather than inlining strings in
 * hooks, so a rename cannot leave one hook reading a stale cache.
 */
export const queryKeys = {
    health: ['health'] as const,
    me: ['me'] as const,
    handleAvailable: (handle: string) => ['handle-available', handle] as const,
    users: {
        search: (q: string) => ['users', 'search', q] as const,
    },
    groups: {
        all: ['groups'] as const,
        list: ['groups', 'list'] as const,
        detail: (groupId: string) => ['groups', 'detail', groupId] as const,
        public: (q: string, page: number) => ['groups', 'public', q, page] as const,
        joinPreview: (token: string) => ['groups', 'join-preview', token] as const,
    },
    members: {
        list: (groupId: string) => ['members', groupId] as const,
    },
    activities: {
        all: (groupId: string) => ['activities', groupId] as const,
        list: (groupId: string, label: string | undefined, sort: string) =>
            ['activities', groupId, 'list', label ?? 'all', sort] as const,
        detail: (groupId: string, activityId: string) =>
            ['activities', groupId, 'detail', activityId] as const,
        suggestions: (groupId: string, activityId: string, memberIds: string) =>
            ['activities', groupId, 'suggestions', activityId, memberIds] as const,
    },
    images: {
        search: (q: string, page: number) => ['images', q, page] as const,
    },
    availability: {
        mineAll: ['availability', 'mine'] as const,
        mine: (from: string, to: string) => ['availability', 'mine', from, to] as const,
        rules: ['availability', 'rules'] as const,
        group: (groupId: string, from: string, to: string, activityId: string | undefined) =>
            ['availability', 'group', groupId, from, to, activityId ?? 'all'] as const,
    },
    occurrences: {
        group: (groupId: string, from: string, to: string) =>
            ['occurrences', groupId, from, to] as const,
    },
    widgets: (groupId: string) => ['widgets', groupId] as const,
    leaderboards: {
        list: (groupId: string) => ['leaderboards', groupId, 'list'] as const,
        /** Everything about one board: detail, rankings, periods, history. */
        one: (groupId: string, leaderboardId: string) =>
            ['leaderboards', groupId, 'one', leaderboardId] as const,
        detail: (groupId: string, leaderboardId: string) =>
            ['leaderboards', groupId, 'one', leaderboardId, 'detail'] as const,
        scores: (groupId: string, leaderboardId: string, query: string) =>
            ['leaderboards', groupId, 'one', leaderboardId, 'scores', query] as const,
        periods: (groupId: string, leaderboardId: string) =>
            ['leaderboards', groupId, 'one', leaderboardId, 'periods'] as const,
        history: (groupId: string, leaderboardId: string, page: number) =>
            ['leaderboards', groupId, 'one', leaderboardId, 'history', page] as const,
    },
    invites: {
        all: ['invites'] as const,
        mine: ['invites', 'mine'] as const,
        group: (groupId: string) => ['invites', 'group', groupId] as const,
    },
};
