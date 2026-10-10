'use client';

import { ScoreType } from '@bzim/types';
import type { LeaderboardDetailDto } from '@bzim/types';
import { Flag, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { AddScoreDialog } from '@/components/leaderboards/add-score-dialog';
import { Button } from '@/components/ui/button';
import { useScoreEntry } from '@/hooks/use-score-entry';
import { useStopwatch } from '@/hooks/use-stopwatch';
import { errorKey } from '@/lib/api/errors';
import { currentPeriod, scopeFor } from '@/lib/leaderboard-periods';
import { formatScore } from '@/lib/score-format';
import { splits } from '@/lib/stopwatch';
import { cn } from '@/lib/utils';

/**
 * A stopwatch for a time board: tap the readout to start, tap it again to
 * stop; lap and reset beside it; on this device, kept across tab switches
 * and reloads. Any stopped time, and any lap, can
 * be saved as somebody's score through the same picker the ranking uses.
 */
export function TimerTab({
    groupId,
    leaderboard,
}: {
    groupId: string;
    leaderboard: LeaderboardDetailDto;
}) {
    const { t } = useTranslation();
    const watch = useStopwatch(`bzim.stopwatch.${leaderboard.id}`);
    const now = currentPeriod();
    const entry = useScoreEntry(
        groupId,
        leaderboard,
        scopeFor(leaderboard.cardPeriod, now.year, now.month),
        null,
    );
    const [saving, setSaving] = useState<number | null>(null);
    const lapTimes = splits(watch.state.laps);
    const show = (ms: number) => formatScore(Math.round(ms), ScoreType.TIME, undefined);

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-4">
                <button
                    type="button"
                    onClick={watch.running ? watch.stop : watch.start}
                    aria-label={watch.running ? t('timer.tapToStop') : t('timer.tapToStart')}
                    className={cn(
                        'w-full rounded-2xl border-2 px-4 py-8 text-5xl font-bold tabular-nums transition-colors select-none active:translate-y-px',
                        watch.running
                            ? 'border-brand bg-brand/15'
                            : 'border-dashed hover:bg-accent',
                    )}
                >
                    <span role="timer" aria-live={watch.running ? 'off' : 'polite'}>
                        {show(watch.elapsedMs)}
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-muted-foreground">
                        {watch.running ? t('timer.tapToStop') : t('timer.tapToStart')}
                    </span>
                </button>
                <div className="flex flex-wrap justify-center gap-2">
                    {watch.running && (
                        <Button size="lg" variant="outline" onClick={watch.lap}>
                            <Flag />
                            {t('timer.lap')}
                        </Button>
                    )}
                    {!watch.running && watch.elapsedMs > 0 && leaderboard.canEditScores && (
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setSaving(Math.round(watch.elapsedMs))}
                        >
                            <Save />
                            {t('timer.save')}
                        </Button>
                    )}
                    {!watch.running && watch.elapsedMs > 0 && (
                        <Button size="lg" variant="ghost" onClick={watch.reset}>
                            <RotateCcw />
                            {t('timer.reset')}
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{t('timer.help')}</p>
            </div>

            {watch.state.laps.length > 0 && (
                <ol className="divide-y border-t">
                    {watch.state.laps.map((total, index) => (
                        <li key={index} className="flex items-center gap-3 py-2 text-sm">
                            <span className="w-7 shrink-0 text-center text-xs font-bold text-muted-foreground tabular-nums">
                                {index + 1}
                            </span>
                            <span className="flex-1 font-semibold tabular-nums">
                                {show(lapTimes[index] ?? 0)}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {t('timer.total', { time: show(total) })}
                            </span>
                            {leaderboard.canEditScores && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('timer.saveLap', { number: index + 1 })}
                                    onClick={() => setSaving(Math.round(lapTimes[index] ?? 0))}
                                >
                                    <Save />
                                </Button>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            {entry.error !== null && saving === null && (
                <FormMessage tone="error">{t(errorKey(entry.error))}</FormMessage>
            )}
            {saving !== null && (
                <AddScoreDialog
                    groupId={groupId}
                    leaderboard={leaderboard}
                    scoredMemberIds={new Set()}
                    initialScore={saving}
                    open
                    onOpenChange={(open) => {
                        if (!open) setSaving(null);
                    }}
                    pending={entry.busy}
                    error={entry.error === null ? null : t(errorKey(entry.error))}
                    onSubmit={(target, score) => entry.save(target, score, () => setSaving(null))}
                />
            )}
        </div>
    );
}
