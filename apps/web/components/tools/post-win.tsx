'use client';

import { Check, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useLeaderboardDetails,
    useLeaderboards,
    useStepScore,
} from '@/hooks/queries/use-leaderboards';
import { refusalKey } from '@/lib/api/errors';
import { boardFitsGame, memberForPlayer, winBoards } from '@/lib/tools/post-win';
import type { ToolPlayer } from '@/lib/tools/players';

/**
 * Picks the board and counts one win there. Only boards with everybody
 * from the game on them are offered, so the winner is always on it. Mounted
 * only while open, so it starts fresh each time.
 */
function PostWinDialog({
    groupId,
    players,
    winner,
    onOpenChange,
    onPosted,
}: {
    groupId: string;
    players: ToolPlayer[];
    winner: ToolPlayer;
    onOpenChange: (open: boolean) => void;
    onPosted: (boardName: string) => void;
}) {
    const { t } = useTranslation();
    const pathname = usePathname();
    const listing = useLeaderboards(groupId);
    // A board for this game: private, its players on it, and back here once saved.
    const newBoard = `/groups/${groupId}/leaderboards/new?${new URLSearchParams([
        ...players.map((player): [string, string] => ['player', player.name]),
        ['returnTo', pathname],
    ]).toString()}`;
    const details = useLeaderboardDetails(
        groupId,
        winBoards(listing.data ?? []).map((board) => board.id),
    );
    const loading = listing.isPending || details.some((detail) => detail.isPending);
    const boards = details.flatMap((detail) =>
        detail.data !== undefined && boardFitsGame(detail.data.members, players)
            ? [detail.data]
            : [],
    );
    const [boardId, setBoardId] = useState<string | null>(null);
    const chosen = boards.find((board) => board.id === boardId) ?? boards[0];
    const member = chosen === undefined ? null : memberForPlayer(chosen.members, winner);
    const step = useStepScore(groupId, chosen?.id ?? '');

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('tools.postWin.title', { name: winner.name })}</DialogTitle>
                    <DialogDescription>{t('tools.postWin.help')}</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="h-16 animate-pulse rounded-xl bg-muted" />
                ) : chosen === undefined ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">{t('tools.postWin.none')}</p>
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={<Link href={newBoard} />}
                        >
                            {t('tools.postWin.newBoard')}
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <Field label={t('tools.postWin.board')}>
                            <Select
                                value={chosen.id}
                                onValueChange={(value) => {
                                    if (value !== null) setBoardId(value);
                                }}
                                items={boards.map((board) => ({
                                    value: board.id,
                                    label: board.name,
                                }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {boards.map((board) => (
                                        <SelectItem key={board.id} value={board.id}>
                                            {board.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        {step.isError && (
                            <FormMessage tone="error">
                                {t(refusalKey(step.error, 'leaderboardProblems'))}
                            </FormMessage>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        disabled={chosen === undefined || member === null || step.isPending}
                        onClick={() => {
                            if (chosen === undefined || member === null) return;
                            step.mutate(
                                { memberId: member.id, delta: 1 },
                                { onSuccess: () => onPosted(chosen.name) },
                            );
                        }}
                    >
                        {t('tools.postWin.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * A finished game's win onto a private board that has everybody who played
 * on it: one up for the winner, in this month, this year and all time
 * (docs/07 M5). Once posted the button says where, and does not post
 * twice. Only for a game with one winner.
 */
export function PostWin({
    groupId,
    players,
    winner,
}: {
    groupId: string;
    players: ToolPlayer[];
    winner: ToolPlayer;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [postedTo, setPostedTo] = useState<string | null>(null);

    return (
        <>
            <Button variant="outline" disabled={postedTo !== null} onClick={() => setOpen(true)}>
                {postedTo === null ? <Trophy /> : <Check />}
                {postedTo === null
                    ? t('tools.postWin.button')
                    : t('tools.postWin.posted', { name: postedTo })}
            </Button>
            {open && (
                <PostWinDialog
                    groupId={groupId}
                    players={players}
                    winner={winner}
                    onOpenChange={setOpen}
                    onPosted={(name) => {
                        setPostedTo(name);
                        setOpen(false);
                    }}
                />
            )}
        </>
    );
}
