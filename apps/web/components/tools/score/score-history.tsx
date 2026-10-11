'use client';

import { DateTime } from 'luxon';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { historyLines } from '@/lib/tools/score';
import type { ScoreEntry, ScoreState } from '@/lib/tools/score';
import { cn } from '@/lib/utils';

/**
 * Every entry, newest first, with the player's total right after it. While
 * the game runs each one can be corrected; once it ended, it is the record.
 */
export function ScoreHistory({
    state,
    onCorrect,
}: {
    state: ScoreState;
    onCorrect?: (entry: ScoreEntry) => void;
}) {
    const { t, i18n } = useTranslation();
    const lines = historyLines(state);
    const signed = new Intl.NumberFormat(i18n.language, { signDisplay: 'always' });
    const nameOf = (id: string) => state.players.find((player) => player.id === id)?.name ?? '';

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-bold">{t('tools.score.history')}</h3>
            {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('tools.score.historyEmpty')}</p>
            ) : (
                <ol className="divide-y border-t">
                    {lines.map(({ entry, total }) => (
                        <li key={entry.id} className="flex items-center gap-3 py-2 text-sm">
                            <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                                {DateTime.fromMillis(entry.at).toFormat('HH:mm')}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-semibold">
                                {nameOf(entry.playerId)}
                            </span>
                            <span
                                className={cn(
                                    'font-bold tabular-nums',
                                    entry.amount < 0 && 'text-destructive',
                                )}
                            >
                                {signed.format(entry.amount)}
                            </span>
                            <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                                {t('tools.score.after', { total })}
                            </span>
                            {onCorrect !== undefined && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('tools.score.correct', {
                                        name: nameOf(entry.playerId),
                                    })}
                                    onClick={() => onCorrect(entry)}
                                >
                                    <Pencil />
                                </Button>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
