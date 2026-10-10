'use client';

import type { LeaderboardDetailDto, LeaderboardMemberDto } from '@bzim/types';
import { UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEADERBOARD } from '@bzim/types';
import { Avatar } from '@/components/common/avatar';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    useAddLeaderboardMember,
    useRemoveLeaderboardMember,
} from '@/hooks/queries/use-leaderboards';
import { useMembers } from '@/hooks/queries/use-members';
import { errorKey } from '@/lib/api/errors';

/**
 * Who is on the board. Any group member may put somebody on it (a sheet
 * with the group members not yet on it); taking somebody off is for the
 * people who may enter scores, and asks first because their scores go too.
 */
export function LeaderboardMembersSection({
    groupId,
    leaderboard,
}: {
    groupId: string;
    leaderboard: LeaderboardDetailDto;
}) {
    const { t } = useTranslation();
    const groupMembers = useMembers(groupId);
    const add = useAddLeaderboardMember(groupId, leaderboard.id);
    const remove = useRemoveLeaderboardMember(groupId, leaderboard.id);
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<LeaderboardMemberDto | null>(null);
    const [guestName, setGuestName] = useState('');
    const guestOk = guestName.trim().length >= LEADERBOARD.GUEST_NAME_MIN_LENGTH;

    const active = leaderboard.members.filter((member) => member.removedAt === null);
    const onBoard = new Set(active.map((member) => member.user?.id));
    const candidates = (groupMembers.data ?? []).filter((member) => !onBoard.has(member.user.id));

    return (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base">
                    <Users className="size-4 text-muted-foreground" />
                    {t('leaderboardDetail.membersTitle', { count: active.length })}
                </h2>
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                    <UserPlus />
                    {t('leaderboardDetail.addMember')}
                </Button>
            </div>

            {active.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {active.map((member) => (
                        <li
                            key={member.id}
                            className="flex items-center gap-2 rounded-full border py-1 pr-1 pl-1 text-sm"
                        >
                            <Avatar avatarKey={member.avatarKey} size="sm" />
                            <span className={leaderboard.canEditScores ? '' : 'pr-2'}>
                                {member.displayName}
                            </span>
                            {leaderboard.canEditScores && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('leaderboardDetail.removeMember', {
                                        name: member.displayName,
                                    })}
                                    onClick={() => setRemoving(member)}
                                >
                                    <X />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">{t('leaderboardDetail.nobodyYet')}</p>
            )}
            {remove.isError && <FormMessage tone="error">{t(errorKey(remove.error))}</FormMessage>}

            <Sheet open={adding} onOpenChange={setAdding}>
                <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
                    <SheetHeader>
                        <SheetTitle>{t('leaderboardDetail.addMember')}</SheetTitle>
                        <SheetDescription>{t('leaderboardDetail.addMemberHelp')}</SheetDescription>
                    </SheetHeader>
                    {add.isError && (
                        <div className="px-4">
                            <FormMessage tone="error">{t(errorKey(add.error))}</FormMessage>
                        </div>
                    )}
                    {candidates.length === 0 ? (
                        <p className="px-4 pb-6 text-sm text-muted-foreground">
                            {t('leaderboardDetail.everyoneOn')}
                        </p>
                    ) : (
                        <ul className="divide-y px-4 pb-6">
                            {candidates.map((member) => (
                                <li key={member.user.id} className="flex items-center gap-3 py-2.5">
                                    <Avatar avatarKey={member.user.avatarKey} size="sm" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                        {member.user.displayName}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={add.isPending}
                                        onClick={() => add.mutate({ userId: member.user.id })}
                                    >
                                        <UserPlus />
                                        {t('leaderboardDetail.add')}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <form
                        className="space-y-2 border-t px-4 py-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!guestOk || add.isPending) return;
                            add.mutate(
                                { name: guestName.trim() },
                                { onSuccess: () => setGuestName('') },
                            );
                        }}
                    >
                        <p className="text-sm font-semibold">{t('leaderboardDetail.addGuest')}</p>
                        <p className="text-xs text-muted-foreground">
                            {t('leaderboardDetail.addGuestHelp')}
                        </p>
                        <div className="flex gap-2">
                            <Input
                                value={guestName}
                                maxLength={LEADERBOARD.GUEST_NAME_MAX_LENGTH}
                                placeholder={t('leaderboardDetail.guestName')}
                                aria-label={t('leaderboardDetail.guestName')}
                                onChange={(event) => setGuestName(event.target.value)}
                            />
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={!guestOk || add.isPending}
                            >
                                <UserPlus />
                                {t('leaderboardDetail.add')}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null);
                }}
                title={t('leaderboardDetail.removeTitle')}
                description={t('leaderboardDetail.removeDescription', {
                    name: removing?.displayName ?? '',
                })}
                confirmLabel={t('leaderboardDetail.removeConfirm')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() => {
                    if (removing !== null) {
                        remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
                    }
                }}
            />
        </section>
    );
}
