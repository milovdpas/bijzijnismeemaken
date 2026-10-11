'use client';

import { DateTime } from 'luxon';
import { Minus, Pencil, Plus, RotateCcw, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PlayerAvatar } from '@/components/tools/player-avatar';
import { PlayerSetup } from '@/components/tools/player-setup';
import { AmountDialog } from '@/components/tools/score/amount-dialog';
import { Button } from '@/components/ui/button';
import { useStoredState } from '@/hooks/use-stored-state';
import type { ToolProps } from '@/lib/tools';
import type { ToolPlayer } from '@/lib/tools/players';
import {
    SCORE_MAX_PLAYERS,
    addEntry,
    correctEntry,
    emptyScore,
    historyLines,
    leaders,
    newRound,
    parseScoreState,
    removeEntry,
    setScorePlayers,
    totals,
} from '@/lib/tools/score';
import type { ScoreEntry } from '@/lib/tools/score';
import { cn } from '@/lib/utils';

/**
 * The score tracker: a row per player with their total and a point up or
 * down, any amount through a tap on the total, and a history in which every
 * entry can be corrected or taken out again.
 */
export function ScoreTool({ groupId, storageKey }: ToolProps) {
    const { t, i18n } = useTranslation();
    const [state, update] = useStoredState(storageKey, parseScoreState, emptyScore);
    const [choosing, setChoosing] = useState(() => state.players.length === 0);
    const [adding, setAdding] = useState<ToolPlayer | null>(null);
    const [correcting, setCorrecting] = useState<ScoreEntry | null>(null);
    const [resetting, setResetting] = useState(false);
    const sums = totals(state);
    const ahead = new Set(leaders(state));
    const lines = historyLines(state);
    const signed = new Intl.NumberFormat(i18n.language, { signDisplay: 'always' });
    const playerOf = (id: string) => state.players.find((player) => player.id === id);
    const correctingPlayer = correcting === null ? undefined : playerOf(correcting.playerId);
    const step = (player: ToolPlayer, amount: 1 | -1) =>
        update((current) => addEntry(current, player.id, amount, Date.now()));

    if (choosing) {
        return (
            <div className="space-y-4">
                <PlayerSetup
                    groupId={groupId}
                    players={state.players}
                    max={SCORE_MAX_PLAYERS}
                    onChange={(players) => update((current) => setScorePlayers(current, players))}
                />
                <div className="flex justify-end">
                    <Button
                        size="lg"
                        disabled={state.players.length === 0}
                        onClick={() => setChoosing(false)}
                    >
                        {t('tools.done')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <ul className="divide-y rounded-2xl border bg-card">
                {state.players.map((player) => (
                    <li key={player.id} className="flex items-center gap-2 px-3 py-2.5">
                        <PlayerAvatar player={player} gold={ahead.has(player.id)} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {player.name}
                        </span>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label={t('tools.score.minusOne', { name: player.name })}
                            onClick={() => step(player, -1)}
                        >
                            <Minus />
                        </Button>
                        <button
                            type="button"
                            aria-label={t('tools.score.addFor', { name: player.name })}
                            onClick={() => setAdding(player)}
                            className="w-16 shrink-0 rounded-lg py-1 text-center text-2xl font-extrabold text-ink tabular-nums transition-colors hover:bg-accent"
                        >
                            {sums[player.id] ?? 0}
                        </button>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label={t('tools.score.plusOne', { name: player.name })}
                            onClick={() => step(player, 1)}
                        >
                            <Plus />
                        </Button>
                    </li>
                ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t('tools.score.tapTotal')}</p>

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setChoosing(true)}>
                    <Users />
                    {t('tools.editPlayers')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={state.entries.length === 0}
                    onClick={() => setResetting(true)}
                >
                    <RotateCcw />
                    {t('tools.score.newRound')}
                </Button>
            </div>

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
                                    {playerOf(entry.playerId)?.name}
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
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('tools.score.correct', {
                                        name: playerOf(entry.playerId)?.name ?? '',
                                    })}
                                    onClick={() => setCorrecting(entry)}
                                >
                                    <Pencil />
                                </Button>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {adding !== null && (
                <AmountDialog
                    player={adding}
                    initial={null}
                    onOpenChange={(open) => {
                        if (!open) setAdding(null);
                    }}
                    onSave={(amount) => {
                        update((current) => addEntry(current, adding.id, amount, Date.now()));
                        setAdding(null);
                    }}
                />
            )}
            {correcting !== null && correctingPlayer !== undefined && (
                <AmountDialog
                    player={correctingPlayer}
                    initial={correcting.amount}
                    onOpenChange={(open) => {
                        if (!open) setCorrecting(null);
                    }}
                    onSave={(amount) => {
                        update((current) => correctEntry(current, correcting.id, amount));
                        setCorrecting(null);
                    }}
                    onDelete={() => {
                        update((current) => removeEntry(current, correcting.id));
                        setCorrecting(null);
                    }}
                />
            )}
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                title={t('tools.score.newRoundTitle')}
                description={t('tools.score.newRoundDescription')}
                confirmLabel={t('tools.score.newRound')}
                onConfirm={() => {
                    update(newRound);
                    setResetting(false);
                }}
            />
        </div>
    );
}
