'use client';

import { ERROR_CODES } from '@bzim/types';
import type { UserSummary } from '@bzim/types';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGroupInvites, useInviteByHandle, useUserSearch } from '@/hooks/queries/use-invites';
import { useMembers } from '@/hooks/queries/use-members';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ApiError } from '@/lib/api/client';
import { errorKey } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

/** Which of the two 409 reasons the API gave, so the message can say what is already true. */
function conflictKey(error: unknown): string | null {
    if (!(error instanceof ApiError) || error.code !== ERROR_CODES.CONFLICT) return null;
    const reason = (error.details as { reason?: string } | undefined)?.reason;
    return reason === 'member' ? 'invite.alreadyMember' : 'invite.alreadyInvited';
}

/**
 * Type a handle, pick the person, invite. Results come from the handle
 * prefix search; the invite itself goes by handle, so the row the person
 * clicked is exactly who gets the email.
 */
export function InviteByHandle({ groupId, className }: { groupId: string; className?: string }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const q = useDebouncedValue(query.trim().replace(/^@/, '').toLowerCase());
    const results = useUserSearch(q);
    const members = useMembers(groupId);
    const pending = useGroupInvites(groupId);
    const invite = useInviteByHandle(groupId);
    const [invited, setInvited] = useState<string[]>([]);

    const send = (user: UserSummary) => {
        invite.mutate(user.handle, {
            onSuccess: () => setInvited((list) => [...list, user.id]),
        });
    };

    const conflict = conflictKey(invite.error);

    // People already in, or already asked, are not offered again: inviting them
    // can only fail, and the list should show who is left to ask.
    const taken = new Set([
        ...(members.data ?? []).map((member) => member.user.id),
        ...(pending.data ?? []).map((row) => row.invitedUser.id),
    ]);
    const candidates = results.data?.filter((user) => !taken.has(user.id));

    return (
        <div className={cn('grid gap-3', className)}>
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    className="pl-9"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={t('invite.search')}
                    aria-label={t('invite.search')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </div>
            <p className="text-xs text-muted-foreground">{t('invite.searchHelp')}</p>

            {candidates !== undefined && candidates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    {results.data !== undefined && results.data.length > 0
                        ? t('invite.allTaken')
                        : t('invite.noResults')}
                </p>
            )}
            {candidates !== undefined && candidates.length > 0 && (
                <ul className="divide-y rounded-xl border">
                    {candidates.map((user) => {
                        const done = invited.includes(user.id);
                        return (
                            <li key={user.id} className="flex items-center gap-3 px-3 py-2">
                                <Avatar avatarKey={user.avatarKey} size="sm" />
                                <span className="min-w-0 flex-1 text-sm">
                                    <span className="block truncate font-semibold">
                                        {user.displayName}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        @{user.handle}
                                    </span>
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={done ? 'secondary' : 'default'}
                                    disabled={done || invite.isPending}
                                    onClick={() => send(user)}
                                >
                                    {done ? t('invite.invited') : t('invite.invite')}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {invite.isError && (
                <FormMessage tone="error">{t(conflict ?? errorKey(invite.error))}</FormMessage>
            )}
        </div>
    );
}
