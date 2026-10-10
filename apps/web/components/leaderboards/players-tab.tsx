'use client';

import type { LeaderboardDetailDto, LeaderboardMemberDto } from '@bzim/types';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { useRemoveLeaderboardMember } from '@/hooks/queries/use-leaderboards';
import { errorKey } from '@/lib/api/errors';

/**
 * Who is on the board, which is whoever has ever been given a score (the
 * ranking's "add score" puts people on). Taking somebody off is for the
 * people who may enter scores, and asks first because their scores go too.
 */
export function PlayersTab({
    groupId,
    leaderboard,
}: {
    groupId: string;
    leaderboard: LeaderboardDetailDto;
}) {
    const { t } = useTranslation();
    const remove = useRemoveLeaderboardMember(groupId, leaderboard.id);
    const [removing, setRemoving] = useState<LeaderboardMemberDto | null>(null);
    const active = leaderboard.members.filter((member) => member.removedAt === null);

    return (
        <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">
                {t('players.count', { count: active.length })}
            </p>
            {active.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {leaderboard.canEditScores ? t('players.emptyEditor') : t('players.empty')}
                </p>
            ) : (
                <ul className="divide-y">
                    {active.map((member) => (
                        <li key={member.id} className="flex items-center gap-3 py-2">
                            <Avatar avatarKey={member.avatarKey} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {member.displayName}
                                {member.user === null && (
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        {t('players.guest')}
                                    </span>
                                )}
                            </span>
                            {leaderboard.canEditScores && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('players.remove', { name: member.displayName })}
                                    onClick={() => setRemoving(member)}
                                >
                                    <X />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {remove.isError && removing === null && (
                <FormMessage tone="error">{t(errorKey(remove.error))}</FormMessage>
            )}

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null);
                }}
                title={t('players.removeTitle')}
                description={t('players.removeDescription', { name: removing?.displayName ?? '' })}
                confirmLabel={t('players.removeConfirm')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() => {
                    if (removing !== null) {
                        remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
                    }
                }}
            />
        </div>
    );
}
