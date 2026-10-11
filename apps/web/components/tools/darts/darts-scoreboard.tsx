'use client';

import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PlayerAvatar } from '@/components/tools/player-avatar';
import { Badge } from '@/components/ui/badge';
import {
    clockHitRate,
    clockTarget,
    currentPlayer,
    legWinner,
    winsOf,
    x01Average,
    x01Remaining,
} from '@/lib/tools/darts';
import type { DartsState } from '@/lib/tools/darts';
import { cn } from '@/lib/utils';

/**
 * A card per player: what is left (x01) or the number to hit next (clock),
 * their average this leg and the legs they won. The thrower is yellow.
 */
export function DartsScoreboard({ state }: { state: DartsState }) {
    const { t, i18n } = useTranslation();
    const thrower = currentPlayer(state);
    const winner = legWinner(state);
    const x01 = state.settings.mode === 'x01';
    const decimal = new Intl.NumberFormat(i18n.language, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

    return (
        <ul className={cn('grid gap-2', state.players.length > 1 && 'grid-cols-2')}>
            {state.players.map((player) => {
                const legs = winsOf(state, player.id);
                const target = clockTarget(state, player.id);
                const average = x01 ? x01Average(state, player.id) : clockHitRate(state, player.id);
                return (
                    <li
                        key={player.id}
                        aria-current={thrower?.id === player.id ? 'true' : undefined}
                        className={cn(
                            'rounded-2xl border bg-card p-3 transition-colors',
                            thrower?.id === player.id && 'border-brand bg-brand/15',
                            winner?.id === player.id && 'border-amber-400',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <PlayerAvatar player={player} gold={winner?.id === player.id} />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {player.name}
                            </span>
                            {legs > 0 && (
                                <Badge variant="outline" className="tabular-nums">
                                    {t('tools.darts.legs', { count: legs })}
                                </Badge>
                            )}
                        </div>
                        <p className="mt-2 text-4xl font-extrabold text-ink tabular-nums">
                            {x01 ? (
                                x01Remaining(state, player.id)
                            ) : target === null ? (
                                <Check className="size-9" aria-label={t('tools.darts.done')} />
                            ) : target === 25 ? (
                                t('tools.darts.bull')
                            ) : (
                                target
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {average === null
                                ? ' '
                                : x01
                                  ? t('tools.darts.average', { value: decimal.format(average) })
                                  : t('tools.darts.hitRate', { value: Math.round(average * 100) })}
                        </p>
                    </li>
                );
            })}
        </ul>
    );
}
