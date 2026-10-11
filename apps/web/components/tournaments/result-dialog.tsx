'use client';

import { MatchStatus } from '@bzim/types';
import type { TournamentDetailDto, TournamentMatchView } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { Input } from '@/components/ui/input';
import { useClearResult, useReportResult } from '@/hooks/queries/use-tournaments';
import { parseScore, resultProblem } from '@/lib/tournament-result';
import { tournamentErrorKey } from '@/lib/tournament-rounds';

/**
 * The score of one match. Its players enter it while it has none; the
 * organiser and admins enter or correct it any time and can clear it again.
 * Mount it with the match as `key`, so the fields start from its result.
 */
export function ResultDialog({
    groupId,
    tournament,
    match,
    onOpenChange,
}: {
    groupId: string;
    tournament: TournamentDetailDto;
    match: TournamentMatchView | null;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation();
    const report = useReportResult(groupId, tournament.id);
    const clear = useClearResult(groupId, tournament.id);
    const [home, setHome] = useState(match?.homeScore?.toString() ?? '');
    const [away, setAway] = useState(match?.awayScore?.toString() ?? '');
    const [touched, setTouched] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);

    if (match === null) return null;

    const homeScore = parseScore(home);
    const awayScore = parseScore(away);
    const problem = resultProblem(homeScore, awayScore, match.stage);
    const pending = report.isPending || clear.isPending;
    const name = (entryId: string | null) =>
        tournament.entries.find((entry) => entry.id === entryId)?.name ?? '';
    const outcome = { onSuccess: () => onOpenChange(false), onError: setFailure };
    const sides = [
        { key: 'home', name: name(match.homeEntryId), value: home, set: setHome },
        { key: 'away', name: name(match.awayEntryId), value: away, set: setAway },
    ];

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <form
                    className="space-y-4"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        setTouched(true);
                        if (problem !== null || homeScore === null || awayScore === null) return;
                        report.mutate(
                            { matchId: match.id, result: { homeScore, awayScore } },
                            outcome,
                        );
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('tournamentPlay.resultTitle')}</DialogTitle>
                        <DialogDescription>{t('tournamentPlay.resultHelp')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {sides.map((side) => (
                            <label key={side.key} className="flex items-center gap-3">
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                    {side.name}
                                </span>
                                <Input
                                    className="w-20 text-center text-base font-bold tabular-nums"
                                    inputMode="numeric"
                                    maxLength={3}
                                    value={side.value}
                                    aria-label={t('tournamentPlay.scoreOf', { name: side.name })}
                                    onChange={(event) => side.set(event.target.value)}
                                />
                            </label>
                        ))}
                    </div>
                    {touched && problem !== null && (
                        <FormMessage tone="error">
                            {problem === 'SCORE'
                                ? t('tournamentPlay.scoreInvalid')
                                : t('tournamentProblems.DRAW_IN_KNOCKOUT')}
                        </FormMessage>
                    )}
                    {failure !== null && (
                        <FormMessage tone="error">{t(tournamentErrorKey(failure))}</FormMessage>
                    )}
                    <DialogFooter>
                        {tournament.canManage && match.status === MatchStatus.PLAYED && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={pending}
                                onClick={() => clear.mutate(match.id, outcome)}
                            >
                                {t('tournamentPlay.clearResult')}
                            </Button>
                        )}
                        <Button type="submit" disabled={pending}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
