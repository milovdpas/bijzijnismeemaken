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
    },
    images: {
        search: (q: string, page: number) => ['images', q, page] as const,
    },
    invites: {
        all: ['invites'] as const,
        mine: ['invites', 'mine'] as const,
        group: (groupId: string) => ['invites', 'group', groupId] as const,
    },
};
