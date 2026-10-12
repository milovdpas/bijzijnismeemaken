'use client';

import type { TournamentEntryDto } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { PersonAvatar } from '@/components/tournaments/person-avatar';
import { cn } from '@/lib/utils';

export type DragHandlers = Pick<
    React.HTMLAttributes<HTMLElement>,
    'draggable' | 'onDragStart' | 'onDragOver' | 'onDrop' | 'onDragEnd'
>;

/**
 * An entry in the draft preview: its people, name and seed. For the
 * organiser it is also a handle: dragged onto another entry the two swap,
 * and a tap picks it so a second tap elsewhere can swap or move it. It is a
 * plain element with a button role rather than a button, because browsers
 * do not all let a button be dragged.
 */
export function EntryChip({
    entry,
    teams,
    interactive,
    picked,
    dragging,
    drag,
    onTap,
}: {
    entry: TournamentEntryDto;
    teams: boolean;
    interactive: boolean;
    picked: boolean;
    dragging: boolean;
    drag: DragHandlers;
    onTap: () => void;
}) {
    const { t } = useTranslation();
    const single = entry.members.length === 1 ? entry.members[0] : undefined;
    const body = (
        <>
            {single !== undefined && !teams ? (
                <PersonAvatar avatarKey={single.avatarKey} className="size-6 rounded-md" />
            ) : (
                <span className="flex shrink-0 -space-x-1.5">
                    {entry.members.slice(0, 3).map((member) => (
                        <PersonAvatar
                            key={member.id}
                            avatarKey={member.avatarKey}
                            className="size-6 rounded-md ring-2 ring-card"
                        />
                    ))}
                </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span>
            <span
                className="shrink-0 text-xs text-muted-foreground tabular-nums"
                title={t('tournamentDraft.seed', { seed: entry.seed })}
            >
                {entry.seed}
            </span>
        </>
    );

    if (!interactive) {
        return <div className="flex min-w-0 items-center gap-2 px-1.5 py-1">{body}</div>;
    }
    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={picked}
            {...drag}
            onClick={onTap}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onTap();
            }}
            className={cn(
                'flex min-w-0 cursor-grab items-center gap-2 rounded-lg px-1.5 py-1 outline-none select-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50',
                picked && 'bg-brand/20 ring-2 ring-brand hover:bg-brand/20',
                dragging && 'opacity-50',
            )}
        >
            {body}
        </div>
    );
}
