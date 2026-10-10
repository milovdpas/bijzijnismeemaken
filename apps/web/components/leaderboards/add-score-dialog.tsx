'use client';

import { LEADERBOARD } from '@bzim/types';
import type { AddLeaderboardMemberRequest, AvatarKey, LeaderboardDetailDto } from '@bzim/types';
import { ChevronRight, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { ScoreDialog } from '@/components/leaderboards/score-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMembers } from '@/hooks/queries/use-members';
import { randomAvatarKey } from '@/lib/avatars';

/** Who is getting a score: somebody already on the board, or somebody to put on it first. */
export type ScoreTarget =
    | { kind: 'member'; memberId: string; name: string; avatarKey: AvatarKey }
    | { kind: 'new'; who: AddLeaderboardMemberRequest; name: string; avatarKey: AvatarKey };

/**
 * Add a score: first pick the person, then type the score. The pick list
 * starts with the people on the board without a score in this period, then
 * the group members not on the board yet, and ends with a name for someone
 * without an account. Picking is what puts someone on the board, so there
 * is no separate "add player" step.
 */
export function AddScoreDialog({
    groupId,
    leaderboard,
    scoredMemberIds,
    initialScore = null,
    open,
    onOpenChange,
    pending,
    error,
    onSubmit,
}: {
    groupId: string;
    leaderboard: LeaderboardDetailDto;
    /** Members already ranked in the period on screen; they are edited from their row instead. */
    scoredMemberIds: Set<string>;
    /** A score already measured (the timer), so the input starts filled. */
    initialScore?: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pending: boolean;
    error: string | null;
    onSubmit: (target: ScoreTarget, score: number) => void;
}) {
    const { t } = useTranslation();
    const groupMembers = useMembers(groupId);
    const [target, setTarget] = useState<ScoreTarget | null>(null);
    const [guestName, setGuestName] = useState('');
    const guestOk = guestName.trim().length >= LEADERBOARD.GUEST_NAME_MIN_LENGTH;

    const active = leaderboard.members.filter((member) => member.removedAt === null);
    const unscored = active.filter((member) => !scoredMemberIds.has(member.id));
    const onBoard = new Set(active.map((member) => member.user?.id));
    const candidates = (groupMembers.data ?? []).filter((member) => !onBoard.has(member.user.id));

    if (target !== null) {
        return (
            <ScoreDialog
                name={target.name}
                avatarKey={target.avatarKey}
                scoreType={leaderboard.scoreType}
                current={null}
                initial={initialScore}
                open={open}
                onOpenChange={(next) => {
                    if (!next) onOpenChange(false);
                }}
                pending={pending}
                error={error}
                onSubmit={(score) => {
                    if (score !== null) onSubmit(target, score);
                }}
            />
        );
    }

    const pickRow = (key: string, name: string, avatarKey: AvatarKey, onPick: () => void) => (
        <li key={key}>
            <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent"
                onClick={onPick}
            >
                <Avatar avatarKey={avatarKey} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
            </button>
        </li>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('ranking.addScore')}</DialogTitle>
                    <DialogDescription>{t('ranking.pickHelp')}</DialogDescription>
                </DialogHeader>

                {unscored.length > 0 && (
                    <section className="space-y-1">
                        <h3 className="text-xs font-semibold text-muted-foreground">
                            {t('ranking.pickOnBoard')}
                        </h3>
                        <ul>
                            {unscored.map((member) =>
                                pickRow(member.id, member.displayName, member.avatarKey, () =>
                                    setTarget({
                                        kind: 'member',
                                        memberId: member.id,
                                        name: member.displayName,
                                        avatarKey: member.avatarKey,
                                    }),
                                ),
                            )}
                        </ul>
                    </section>
                )}

                {candidates.length > 0 && (
                    <section className="space-y-1">
                        <h3 className="text-xs font-semibold text-muted-foreground">
                            {t('ranking.pickGroup')}
                        </h3>
                        <ul>
                            {candidates.map((member) =>
                                pickRow(
                                    member.user.id,
                                    member.user.displayName,
                                    member.user.avatarKey,
                                    () =>
                                        setTarget({
                                            kind: 'new',
                                            who: { userId: member.user.id },
                                            name: member.user.displayName,
                                            avatarKey: member.user.avatarKey,
                                        }),
                                ),
                            )}
                        </ul>
                    </section>
                )}

                <form
                    className="space-y-2 border-t pt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!guestOk) return;
                        const avatarKey = randomAvatarKey();
                        setTarget({
                            kind: 'new',
                            who: { name: guestName.trim(), avatarKey },
                            name: guestName.trim(),
                            avatarKey,
                        });
                    }}
                >
                    <h3 className="text-xs font-semibold text-muted-foreground">
                        {t('ranking.pickGuest')}
                    </h3>
                    <p className="text-xs text-muted-foreground">{t('ranking.guestHelp')}</p>
                    <div className="flex gap-2">
                        <Input
                            value={guestName}
                            maxLength={LEADERBOARD.GUEST_NAME_MAX_LENGTH}
                            placeholder={t('ranking.guestName')}
                            aria-label={t('ranking.guestName')}
                            onChange={(event) => setGuestName(event.target.value)}
                        />
                        <Button type="submit" variant="outline" disabled={!guestOk}>
                            <UserPlus />
                            {t('common.next')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
