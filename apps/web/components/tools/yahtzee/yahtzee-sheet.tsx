'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GameActions } from '@/components/tools/game-actions';
import { GameResult } from '@/components/tools/game-result';
import { PlayerAvatar } from '@/components/tools/player-avatar';
import { YahtzeeBonusDialog } from '@/components/tools/yahtzee/yahtzee-bonus-dialog';
import { YahtzeeCellDialog } from '@/components/tools/yahtzee/yahtzee-cell-dialog';
import { Button } from '@/components/ui/button';
import type { StoredUpdate } from '@/hooks/use-stored-state';
import { launchConfetti } from '@/lib/confetti';
import type { ToolPlayer } from '@/lib/tools/players';
import {
    BONUS_THRESHOLD,
    LOWER_CATEGORIES,
    UPPER_CATEGORIES,
    bonusPace,
    earnsYahtzeeBonus,
    endYahtzee,
    isFinished,
    nextPlayer,
    playerTotals,
    setExtraYahtzees,
    setScore,
    startYahtzee,
    yahtzeeToSetup,
    yahtzeeWinners,
} from '@/lib/tools/yahtzee';
import type { YahtzeeCategory, YahtzeeState } from '@/lib/tools/yahtzee';
import { cn } from '@/lib/utils';

const STICKY = 'sticky left-0 z-10 px-3 text-left text-xs whitespace-nowrap';

/**
 * The sheet: a column per player, the thirteen boxes, the upper total with
 * how it paces against the bonus, the Yahtzee bonus and the totals. The
 * column of whoever is next is tinted; the box names stay put while the
 * sheet scrolls. A finished sheet can still be corrected.
 */
export function YahtzeeSheetView({
    state,
    update,
}: {
    state: YahtzeeState;
    update: StoredUpdate<YahtzeeState>;
}) {
    const { t, i18n } = useTranslation();
    const [editing, setEditing] = useState<{
        player: ToolPlayer;
        category: YahtzeeCategory;
    } | null>(null);
    const [bonusFor, setBonusFor] = useState<ToolPlayer | null>(null);
    const finished = isFinished(state);
    const next = nextPlayer(state);
    const winners = yahtzeeWinners(state);
    const sheetOf = (player: ToolPlayer) => state.sheets[player.id] ?? {};
    const totalsOf = (player: ToolPlayer) => playerTotals(state, player.id);
    const signed = new Intl.NumberFormat(i18n.language, { signDisplay: 'exceptZero' });
    const tint = (player: ToolPlayer) => next?.id === player.id && 'bg-brand/10';
    const anyScore = state.players.some((player) => totalsOf(player).filled > 0);

    /** Applies a change and celebrates when it is the one that ended the game. */
    const apply = (change: (current: YahtzeeState) => YahtzeeState) => {
        update(change);
        const after = change(state);
        if (!isFinished(state) && yahtzeeWinners(after).length > 0) launchConfetti();
    };

    const row = (category: YahtzeeCategory) => (
        <tr key={category} className="border-b">
            <th scope="row" className={cn(STICKY, 'bg-card py-1 font-semibold')}>
                {t(`tools.yahtzee.categories.${category}`)}
            </th>
            {state.players.map((player) => {
                const value = sheetOf(player)[category];
                return (
                    <td key={player.id} className={cn('px-1 py-1', tint(player))}>
                        <button
                            type="button"
                            aria-label={t('tools.yahtzee.cellTitle', {
                                category: t(`tools.yahtzee.categories.${category}`),
                                name: player.name,
                            })}
                            onClick={() => setEditing({ player, category })}
                            className={cn(
                                'h-8 w-full min-w-11 rounded-lg text-sm font-bold tabular-nums transition-colors hover:bg-accent',
                                value === undefined && 'border border-dashed',
                                value === 0 && 'text-muted-foreground',
                            )}
                        >
                            {value}
                        </button>
                    </td>
                );
            })}
        </tr>
    );

    const sumRow = (
        label: string,
        cell: (player: ToolPlayer) => React.ReactNode,
        strong = false,
    ) => (
        <tr className={cn('border-b bg-muted/40', strong && 'border-b-0')}>
            <th
                scope="row"
                className={cn(STICKY, 'bg-muted py-1.5', strong ? 'font-extrabold' : 'font-bold')}
            >
                {label}
            </th>
            {state.players.map((player) => (
                <td
                    key={player.id}
                    className={cn(
                        'px-1 py-1.5 text-center tabular-nums',
                        strong ? 'text-base font-extrabold text-ink' : 'text-sm font-bold',
                    )}
                >
                    {cell(player)}
                </td>
            ))}
        </tr>
    );

    const bonusRow = (
        <tr className="border-b">
            <th scope="row" className={cn(STICKY, 'bg-card py-1 font-semibold')}>
                {t('tools.yahtzee.yahtzeeBonus')}
            </th>
            {state.players.map((player) => {
                const eligible = earnsYahtzeeBonus(sheetOf(player));
                const { yahtzeeBonus } = totalsOf(player);
                return (
                    <td key={player.id} className={cn('px-1 py-1', tint(player))}>
                        <button
                            type="button"
                            disabled={!eligible}
                            title={eligible ? undefined : t('tools.yahtzee.bonusNone')}
                            aria-label={t('tools.yahtzee.bonusCell', { name: player.name })}
                            onClick={() => setBonusFor(player)}
                            className="flex h-8 w-full min-w-11 items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:hover:bg-transparent"
                        >
                            {yahtzeeBonus > 0 ? (
                                yahtzeeBonus
                            ) : eligible ? (
                                <Plus className="size-3.5 text-muted-foreground" />
                            ) : (
                                '–'
                            )}
                        </button>
                    </td>
                );
            })}
        </tr>
    );

    return (
        <div className="space-y-4">
            {finished ? (
                <GameResult
                    winners={winners}
                    detail={
                        winners[0] === undefined
                            ? undefined
                            : t('tools.result.points', { count: totalsOf(winners[0]).total })
                    }
                >
                    <Button onClick={() => update(startYahtzee)}>{t('tools.newGame')}</Button>
                    <Button variant="outline" onClick={() => update(yahtzeeToSetup)}>
                        {t('tools.changePlayers')}
                    </Button>
                </GameResult>
            ) : (
                next !== null && (
                    <p className="text-sm font-semibold">
                        {t('tools.yahtzee.next', { name: next.name })}
                    </p>
                )
            )}

            <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b">
                            <th scope="col" className={cn(STICKY, 'bg-card py-2')}>
                                <span className="sr-only">{t('tools.yahtzee.box')}</span>
                            </th>
                            {state.players.map((player) => (
                                <th
                                    key={player.id}
                                    scope="col"
                                    className={cn('px-1 py-2 font-semibold', tint(player))}
                                >
                                    <span className="flex flex-col items-center gap-1">
                                        <PlayerAvatar
                                            player={player}
                                            gold={winners.some((winner) => winner.id === player.id)}
                                        />
                                        <span className="max-w-20 truncate text-xs">
                                            {player.name}
                                        </span>
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {UPPER_CATEGORIES.map(row)}
                        {sumRow(t('tools.yahtzee.upper'), (player) => {
                            const pace = bonusPace(sheetOf(player));
                            return (
                                <span className="flex flex-col items-center leading-tight">
                                    {totalsOf(player).upper}
                                    <span
                                        className={cn(
                                            'text-[0.65rem] font-semibold',
                                            pace < 0 ? 'text-destructive' : 'text-muted-foreground',
                                        )}
                                    >
                                        {pace === 0 ? ' ' : signed.format(pace)}
                                    </span>
                                </span>
                            );
                        })}
                        {sumRow(
                            t('tools.yahtzee.bonus', { threshold: BONUS_THRESHOLD }),
                            (player) => {
                                const { bonus, upper } = totalsOf(player);
                                return bonus > 0 ? (
                                    bonus
                                ) : (
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {upper}/{BONUS_THRESHOLD}
                                    </span>
                                );
                            },
                        )}
                        {LOWER_CATEGORIES.map(row)}
                        {bonusRow}
                        {sumRow(t('tools.yahtzee.lower'), (player) => totalsOf(player).lower)}
                        {sumRow(t('tools.yahtzee.total'), (player) => totalsOf(player).total, true)}
                    </tbody>
                </table>
            </div>

            {!finished && (
                <GameActions
                    canEnd={anyScore}
                    onEnd={() => apply(endYahtzee)}
                    onCancel={() => update(yahtzeeToSetup)}
                />
            )}

            {editing !== null && (
                <YahtzeeCellDialog
                    player={editing.player}
                    category={editing.category}
                    current={sheetOf(editing.player)[editing.category] ?? null}
                    onOpenChange={(open) => {
                        if (!open) setEditing(null);
                    }}
                    onSave={(value) => {
                        apply((current) =>
                            setScore(current, editing.player.id, editing.category, value),
                        );
                        setEditing(null);
                    }}
                />
            )}
            {bonusFor !== null && (
                <YahtzeeBonusDialog
                    player={bonusFor}
                    current={state.extraYahtzees[bonusFor.id] ?? 0}
                    onOpenChange={(open) => {
                        if (!open) setBonusFor(null);
                    }}
                    onSave={(count) => {
                        update((current) => setExtraYahtzees(current, bonusFor.id, count));
                        setBonusFor(null);
                    }}
                />
            )}
        </div>
    );
}
