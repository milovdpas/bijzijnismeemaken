'use client';

import { RotateCcw, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PlayerAvatar } from '@/components/tools/player-avatar';
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
    isFinished,
    nextPlayer,
    setScore,
    sheetTotals,
    startYahtzee,
    yahtzeeToSetup,
    yahtzeeWinners,
} from '@/lib/tools/yahtzee';
import type { YahtzeeCategory, YahtzeeState } from '@/lib/tools/yahtzee';
import { cn } from '@/lib/utils';

type Leaving = 'restart' | 'players';

/**
 * The sheet: a column per player, the thirteen boxes, the upper total with
 * how it paces against the bonus, and the totals. The column of whoever is
 * next is tinted; the category column stays put while the sheet scrolls.
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
    const [leaving, setLeaving] = useState<Leaving | null>(null);
    const next = nextPlayer(state);
    const winners = yahtzeeWinners(state);
    const sheetOf = (player: ToolPlayer) => state.sheets[player.id] ?? {};
    const totalsOf = (player: ToolPlayer) => sheetTotals(sheetOf(player));
    const signed = new Intl.NumberFormat(i18n.language, { signDisplay: 'exceptZero' });
    const tint = (player: ToolPlayer) => next?.id === player.id && 'bg-brand/10';
    const anyScore = state.players.some((player) => totalsOf(player).filled > 0);

    const leave = (kind: Leaving) => {
        update(kind === 'restart' ? startYahtzee : yahtzeeToSetup);
        setLeaving(null);
    };

    const row = (category: YahtzeeCategory) => (
        <tr key={category} className="border-b">
            <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-3 py-1 text-left text-xs font-semibold whitespace-nowrap"
            >
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
                className={cn(
                    'sticky left-0 z-10 bg-muted px-3 py-1.5 text-left text-xs whitespace-nowrap',
                    strong ? 'font-extrabold' : 'font-bold',
                )}
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

    return (
        <div className="space-y-4">
            {winners.length > 0 && (
                <section className="rounded-2xl border-2 border-brand bg-brand/15 p-4 text-center">
                    <p className="text-lg font-extrabold text-ink">
                        {winners.length === 1
                            ? t('tools.yahtzee.winner', {
                                  name: winners[0]?.name ?? '',
                                  total: winners[0] ? totalsOf(winners[0]).total : 0,
                              })
                            : t('tools.yahtzee.tie', {
                                  total: winners[0] ? totalsOf(winners[0]).total : 0,
                              })}
                    </p>
                </section>
            )}
            {next !== null && (
                <p className="text-sm font-semibold">
                    {t('tools.yahtzee.next', { name: next.name })}
                </p>
            )}

            <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b">
                            <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2">
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
                        {sumRow(t('tools.yahtzee.lower'), (player) => totalsOf(player).lower)}
                        {sumRow(t('tools.yahtzee.total'), (player) => totalsOf(player).total, true)}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!anyScore}
                    onClick={() => setLeaving('restart')}
                >
                    <RotateCcw />
                    {t('tools.newGame')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (anyScore ? setLeaving('players') : leave('players'))}
                >
                    <Users />
                    {t('tools.editPlayers')}
                </Button>
            </div>

            {editing !== null && (
                <YahtzeeCellDialog
                    player={editing.player}
                    category={editing.category}
                    current={sheetOf(editing.player)[editing.category] ?? null}
                    onOpenChange={(open) => {
                        if (!open) setEditing(null);
                    }}
                    onSave={(value) => {
                        const change = (current: YahtzeeState) =>
                            setScore(current, editing.player.id, editing.category, value);
                        update(change);
                        if (!isFinished(state) && isFinished(change(state))) launchConfetti();
                        setEditing(null);
                    }}
                />
            )}
            <ConfirmDialog
                open={leaving !== null}
                onOpenChange={(open) => {
                    if (!open) setLeaving(null);
                }}
                title={
                    leaving === 'players'
                        ? t('tools.yahtzee.playersTitle')
                        : t('tools.newGameTitle')
                }
                description={
                    leaving === 'players'
                        ? t('tools.yahtzee.playersDescription')
                        : t('tools.newGameDescription')
                }
                confirmLabel={leaving === 'players' ? t('tools.editPlayers') : t('tools.newGame')}
                onConfirm={() => {
                    if (leaving !== null) leave(leaving);
                }}
            />
        </div>
    );
}
