'use client';

import { DAYPART_ORDER } from '@bzim/types';
import type { Daypart } from '@bzim/types';
import { Repeat } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** What one cell shows. `rule` is busy by the week schedule, `manual` busy by hand. */
export type CellState = 'free' | 'manual' | 'rule' | 'calendar';

export interface GridRow {
    key: string;
    label: string;
    /** Today, or the weekday of today. */
    highlight?: boolean;
    /** Weekend rows get a quieter background. */
    shaded?: boolean;
    /** Past: shown, never tapped. */
    locked?: boolean;
    cells: Record<Daypart, CellState>;
    /** What a calendar cell is busy with; the owner's own view only. */
    titles?: Partial<Record<Daypart, string[]>>;
}

/**
 * Rows of something down, the three dayparts across, one tap per cell. The
 * week schedule and the month view are the same grid with different rows,
 * so the two read the same and teach each other. A `rule` cell is only
 * tappable where rules are edited (the week grid); in the month grid it is
 * a mark, and the week grid above is where to change it.
 */
export function DaypartGrid({
    rows,
    rulesEditable,
    pending,
    onToggle,
    className,
}: {
    rows: GridRow[];
    rulesEditable: boolean;
    pending: boolean;
    onToggle: (rowKey: string, daypart: Daypart, busy: boolean) => void;
    className?: string;
}) {
    const { t } = useTranslation();

    const cellClass = (state: CellState, locked: boolean) =>
        cn(
            'flex h-10 w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-lg text-xs font-semibold transition-colors',
            state === 'free' && 'bg-free/30 text-foreground hover:bg-free/50',
            state === 'manual' && 'bg-busy/80 text-white hover:bg-busy',
            state === 'rule' &&
                (rulesEditable
                    ? 'bg-busy/80 text-white hover:bg-busy'
                    : 'cursor-default bg-busy/40 text-foreground'),
            state === 'calendar' && 'cursor-default bg-busy/40 text-foreground',
            locked && 'opacity-40',
        );

    return (
        <div className={cn('rounded-2xl border bg-card', className)}>
            {/* Sticky under the top bar: thirty rows down, the columns still say what they are. */}
            <div className="sticky top-(--h-topbar) z-(--z-sticky) grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] gap-1 rounded-t-2xl border-b bg-card px-2 py-2 text-[11px] font-semibold text-muted-foreground">
                <span />
                {DAYPART_ORDER.map((daypart) => (
                    <span key={daypart} className="text-center">
                        {t(`daypartsShort.${daypart}`)}
                    </span>
                ))}
            </div>
            <div className={cn('divide-y', pending && 'opacity-70')}>
                {rows.map((row) => (
                    <div
                        key={row.key}
                        className={cn(
                            'grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] items-center gap-1 px-2 py-1',
                            row.shaded && 'bg-muted/30',
                            row.highlight && 'bg-brand/10',
                        )}
                    >
                        <span
                            className={cn(
                                'text-xs font-semibold tabular-nums',
                                row.highlight ? 'text-ink' : 'text-muted-foreground',
                            )}
                        >
                            {row.label}
                        </span>
                        {DAYPART_ORDER.map((daypart) => {
                            const state = row.cells[daypart];
                            const titles = row.titles?.[daypart] ?? [];
                            const tappable =
                                state === 'free' ||
                                state === 'manual' ||
                                (state === 'rule' && rulesEditable);
                            return (
                                <button
                                    key={daypart}
                                    type="button"
                                    disabled={!tappable || row.locked === true}
                                    aria-pressed={state !== 'free'}
                                    aria-label={`${row.label} ${t(`dayparts.${daypart}`)}`}
                                    title={
                                        state === 'calendar' && titles.length > 0
                                            ? titles.join('\n')
                                            : state === 'rule' && !rulesEditable
                                              ? t('availability.ruleHint')
                                              : undefined
                                    }
                                    onClick={() => onToggle(row.key, daypart, state === 'free')}
                                    className={cellClass(state, row.locked === true)}
                                >
                                    {state === 'rule' && <Repeat className="size-3.5" />}
                                    {(state === 'manual' || (state === 'rule' && rulesEditable)) &&
                                        t('availability.busy')}
                                    {state === 'calendar' && titles.length > 0 && (
                                        <span className="min-w-0 truncate px-1 text-[10px] leading-tight font-semibold">
                                            {titles[0]}
                                            {titles.length > 1 && ` +${String(titles.length - 1)}`}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
