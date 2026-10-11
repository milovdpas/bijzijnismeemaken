'use client';

import { useTranslation } from 'react-i18next';

import { clockTargets, turnLines } from '@/lib/tools/darts';
import type { DartsState } from '@/lib/tools/darts';
import { cn } from '@/lib/utils';

/** This leg's turns, newest first, with where each player stood afterwards. */
export function DartsHistory({ state }: { state: DartsState }) {
    const { t } = useTranslation();
    const lines = turnLines(state);
    const x01 = state.settings.mode === 'x01';
    const targets = clockTargets(state.settings).length;
    const nameOf = (id: string) => state.players.find((player) => player.id === id)?.name ?? '';

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-bold">{t('tools.darts.history')}</h3>
            {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('tools.darts.historyEmpty')}</p>
            ) : (
                <ol className="divide-y border-t">
                    {lines.map(({ turn, after }, index) => (
                        <li
                            key={lines.length - index}
                            className="flex items-center gap-3 py-2 text-sm"
                        >
                            <span className="min-w-0 flex-1 truncate font-semibold">
                                {nameOf(turn.playerId)}
                            </span>
                            <span
                                className={cn(
                                    'font-bold tabular-nums',
                                    turn.bust && 'text-destructive',
                                )}
                            >
                                {!x01
                                    ? t('tools.darts.hitCount', { count: turn.value })
                                    : turn.bust
                                      ? t('tools.darts.bustValue', { value: turn.value })
                                      : turn.value}
                            </span>
                            <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                                {x01
                                    ? t('tools.darts.left', { remaining: after })
                                    : `${String(after)} / ${String(targets)}`}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
