'use client';

import { GroupRole } from '@bzim/types';
import type { GroupMemberResponse } from '@bzim/types';
import { LogOut, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { InviteSection } from '@/components/groups/invite-section';
import { MemberActionsSheet, memberActions } from '@/components/groups/member-actions-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGroup } from '@/hooks/queries/use-groups';
import { useMe } from '@/hooks/queries/use-me';
import { useLeaveGroup, useMembers } from '@/hooks/queries/use-members';
import { errorKey } from '@/lib/api/errors';
import { formatDate } from '@/lib/format-date';

const RANK: Record<GroupRole, number> = {
    [GroupRole.OWNER]: 0,
    [GroupRole.ADMIN]: 1,
    [GroupRole.MEMBER]: 2,
};

/** One list: owner on top, then admins, then members; the API's name order holds within a role. */
function sortByRole(members: GroupMemberResponse[]): GroupMemberResponse[] {
    return [...members].sort((a, b) => RANK[a.role] - RANK[b.role]);
}

/**
 * Everyone in the group in one list, a pill on the owner and admins. Admins
 * get the invite box on top and an actions button on the rows they may act
 * on; everybody except the owner gets the way out at the bottom.
 */
export function MembersView({ groupId }: { groupId: string }) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const me = useMe();
    const group = useGroup(groupId);
    const members = useMembers(groupId);
    const leave = useLeaveGroup(groupId);
    const [selected, setSelected] = useState<GroupMemberResponse | null>(null);
    const [leaving, setLeaving] = useState(false);

    if (group.data === undefined || members.data === undefined) {
        return (
            <div className="space-y-3">
                <div className="h-14 animate-pulse rounded-xl bg-muted" />
                <div className="h-14 animate-pulse rounded-xl bg-muted" />
            </div>
        );
    }
    if (members.isError) {
        return <FormMessage tone="error">{t(errorKey(members.error))}</FormMessage>;
    }

    const myRole = group.data.role;
    const isAdmin = myRole === GroupRole.OWNER || myRole === GroupRole.ADMIN;
    const canAct = (member: GroupMemberResponse) => {
        if (member.user.id === me.data?.id) return false;
        const can = memberActions(myRole, member.role);
        return can.changeRole || can.transfer || can.remove;
    };

    return (
        <div className="space-y-6">
            {isAdmin && <InviteSection groupId={groupId} />}

            <ul className="divide-y rounded-2xl border bg-card">
                {sortByRole(members.data).map((member) => (
                    <li key={member.user.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar avatarKey={member.user.avatarKey} size="md" />
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">
                                    {member.user.displayName}
                                </span>
                                {member.role !== GroupRole.MEMBER && (
                                    <Badge variant="secondary">{t(`role.${member.role}`)}</Badge>
                                )}
                                {member.user.id === me.data?.id && (
                                    <Badge variant="outline">{t('members.you')}</Badge>
                                )}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                                @{member.user.handle} ·{' '}
                                {t('members.joined', {
                                    date: formatDate(member.joinedAt, i18n.language),
                                })}
                            </span>
                        </span>
                        {canAct(member) && (
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t('members.actions', {
                                    name: member.user.displayName,
                                })}
                                onClick={() => setSelected(member)}
                            >
                                <MoreHorizontal />
                            </Button>
                        )}
                    </li>
                ))}
            </ul>

            {myRole !== GroupRole.OWNER && (
                <div className="flex justify-end">
                    <Button variant="destructive" onClick={() => setLeaving(true)}>
                        <LogOut />
                        {t('members.leave')}
                    </Button>
                </div>
            )}

            {selected !== null && (
                <MemberActionsSheet
                    groupId={groupId}
                    actorRole={myRole}
                    member={selected}
                    open
                    onOpenChange={(open) => {
                        if (!open) setSelected(null);
                    }}
                />
            )}
            <ConfirmDialog
                open={leaving}
                onOpenChange={setLeaving}
                title={t('members.leave')}
                description={t('members.leaveDescription', { name: group.data.name })}
                confirmLabel={t('members.leave')}
                destructive
                pending={leave.isPending}
                error={leave.isError ? t(errorKey(leave.error)) : null}
                onConfirm={() =>
                    leave.mutate(undefined, { onSuccess: () => router.push('/groups') })
                }
            />
        </div>
    );
}
