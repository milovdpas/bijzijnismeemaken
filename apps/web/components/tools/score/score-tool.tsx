'use client';

import { Minus, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FinalStanding } from '@/components/tools/final-standing';
import { GameActions } from '@/components/tools/game-actions';
import { GameResult } from '@/components/tools/game-result';
import { PlayerAvatar } from '@/components/tools/player-avatar';
import { PlayerSetup } from '@/components/tools/player-setup';
import { AmountDialog } from '@/components/tools/score/amount-dialog';
import { ScoreHistory } from '@/components/tools/score/score-history';
import { Button } from '@/components/ui/button';
import { useStoredState } from '@/hooks/use-stored-state';
import { launchConfetti } from '@/lib/confetti';
import type { ToolProps } from '@/lib/tools';
import { rankPlayers } from '@/lib/tools/players';
import type { ToolPlayer } from '@/lib/tools/players';
import {
    SCORE_MAX_PLAYERS,
    addEntry,
    correctEntry,
    emptyScore,
    endScore,
    leaders,
    parseScoreState,
    removeEntry,
    restartScore,
    scoreWinners,
    setScorePlayers,
    totals,
} from '@/lib/tools/score';
import type { ScoreEntry } from '@/lib/tools/score';

/**
 * The score tracker: a row per player with their total and a point up or
 * down, any amount through a tap on the total, and a history in which every
 * entry can be corrected or taken out again. Ending the game turns the rows
 * into the final standing.
 */
export function ScoreTool({ groupId, storageKey }: ToolProps) {
    const { t } = useTranslation();
    const [state, update] = useStoredState(storageKey, parseScoreState, emptyScore);
    const [choosing, setChoosing] = useState(() => state.players.length === 0);
    const [adding, setAdding] = useState<ToolPlayer | null>(null);
    const [correcting, setCorrecting] = useState<ScoreEntry | null>(null);
    /** A new player list that would drop somebody's points, waiting for a yes. */
    const [dropping, setDropping] = useState<ToolPlayer[] | null>(null);
    const sums = totals(state);
    const ahead = new Set(leaders(state));
    const playerOf = (id: string) => state.players.find((player) => player.id === id);
    const correctingPlayer = correcting === null ? undefined : playerOf(correcting.playerId);
    const step = (player: ToolPlayer, amount: 1 | -1) =>
        update((current) => addEntry(current, player.id, amount, Date.now()));
    const changePlayers = (players: ToolPlayer[]) => {
        const kept = new Set(players.map((player) => player.id));
        if (state.entries.some((entry) => !kept.has(entry.playerId))) setDropping(players);
        else update((current) => setScorePlayers(current, players));
    };

    if (choosing) {
        return (
            <div className="space-y-4">
                <PlayerSetup
                    groupId={groupId}
                    players={state.players}
                    max={SCORE_MAX_PLAYERS}
                    onChange={changePlayers}
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
                <ConfirmDialog
                    open={dropping !== null}
                    onOpenChange={(open) => {
                        if (!open) setDropping(null);
                    }}
                    title={t('tools.score.removeTitle')}
                    description={t('tools.score.removeDescription')}
                    confirmLabel={t('tools.score.removeConfirm')}
                    destructive
                    onConfirm={() => {
                        if (dropping !== null) {
                            update((current) => setScorePlayers(current, dropping));
                        }
                        setDropping(null);
                    }}
                />
            </div>
        );
    }

    if (state.finished) {
        const winners = scoreWinners(state);
        const top = winners[0];
        return (
            <div className="space-y-5">
                <GameResult
                    winners={winners}
                    detail={
                        top === undefined
                            ? undefined
                            : t('tools.result.points', { count: sums[top.id] ?? 0 })
                    }
                >
                    <Button onClick={() => update(restartScore)}>{t('tools.newGame')}</Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            update(restartScore);
                            setChoosing(true);
                        }}
                    >
                        {t('tools.changePlayers')}
                    </Button>
                </GameResult>
                <FinalStanding
                    rows={rankPlayers(state.players, (player) => sums[player.id] ?? 0)}
                    format={String}
                    highlight={winners.length > 0}
                />
                <ScoreHistory state={state} />
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

            <GameActions
                canEnd={state.entries.length > 0}
                onEnd={() => {
                    update(endScore);
                    launchConfetti();
                }}
                onCancel={() => update(restartScore)}
            >
                <Button variant="outline" size="sm" onClick={() => setChoosing(true)}>
                    <Users />
                    {t('tools.editPlayers')}
                </Button>
            </GameActions>

            <ScoreHistory state={state} onCorrect={setCorrecting} />

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
        </div>
    );
}
