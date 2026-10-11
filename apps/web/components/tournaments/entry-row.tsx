'use client';

import type { TournamentEntryDto } from '@bzim/types';
import { ChevronDown, ChevronUp, GripVertical, Pencil, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PersonAvatar } from '@/components/tournaments/person-avatar';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type DragHandlers = Pick<
    React.HTMLAttributes<HTMLLIElement>,
    'draggable' | 'onDragStart' | 'onDragOver' | 'onDrop' | 'onDragEnd'
>;

/**
 * One entry of the draft: its seed, its people and, for the organiser, the
 * ways to move it. A desktop drags the whole row by its handle; a phone gets
 * the arrows and, in a group stage, a group picker instead, since touch
 * screens do not drag and drop.
 */
export function EntryRow({
    entry,
    teams,
    manage,
    groupCount,
    canUp,
    canDown,
    busy,
    dragging,
    drag,
    onUp,
    onDown,
    onGroup,
    onRename,
    onRemove,
}: {
    entry: TournamentEntryDto;
    teams: boolean;
    manage: boolean;
    /** Null when there is no group stage. */
    groupCount: number | null;
    canUp: boolean;
    canDown: boolean;
    busy: boolean;
    dragging: boolean;
    drag: DragHandlers;
    onUp: () => void;
    onDown: () => void;
    onGroup: (groupNo: number) => void;
    onRename: () => void;
    onRemove: () => void;
}) {
    const { t } = useTranslation();
    const single = entry.members.length === 1 ? entry.members[0] : undefined;
    const groups = Array.from({ length: groupCount ?? 0 }, (_, index) => index + 1);

    return (
        <li
            {...drag}
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-2 py-2',
                dragging && 'opacity-50',
            )}
        >
            {manage && (
                <span
                    className="hidden cursor-grab touch-none text-muted-foreground md:flex"
                    aria-hidden
                >
                    <GripVertical className="size-4" />
                </span>
            )}
            <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground tabular-nums">
                {entry.seed}
            </span>
            {single !== undefined && !teams ? (
                <PersonAvatar avatarKey={single.avatarKey} />
            ) : (
                <span className="flex shrink-0 -space-x-2">
                    {entry.members.slice(0, 3).map((member) => (
                        <PersonAvatar
                            key={member.id}
                            avatarKey={member.avatarKey}
                            className="ring-2 ring-card"
                        />
                    ))}
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry.name}</span>
                {teams ? (
                    <span className="block truncate text-xs text-muted-foreground">
                        {entry.members.map((member) => member.displayName).join(', ')}
                    </span>
                ) : (
                    single?.user === null && (
                        <span className="block text-xs text-muted-foreground">
                            {t('tournamentDraft.guest')}
                        </span>
                    )
                )}
            </span>
            {manage && (
                <span className="ml-auto flex shrink-0 items-center gap-1">
                    {groupCount !== null && (
                        <span className="md:hidden">
                            <Select
                                value={entry.groupNo === null ? null : String(entry.groupNo)}
                                onValueChange={(value) => {
                                    if (value !== null) onGroup(Number(value));
                                }}
                                items={groups.map((groupNo) => ({
                                    value: String(groupNo),
                                    label: t('tournamentDraft.group', { number: groupNo }),
                                }))}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label={t('tournamentDraft.moveToGroup', {
                                        name: entry.name,
                                    })}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map((groupNo) => (
                                        <SelectItem key={groupNo} value={String(groupNo)}>
                                            {t('tournamentDraft.group', { number: groupNo })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </span>
                    )}
                    <span className="flex md:hidden">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={!canUp || busy}
                            aria-label={t('tournamentDraft.moveUp', { name: entry.name })}
                            onClick={onUp}
                        >
                            <ChevronUp />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={!canDown || busy}
                            aria-label={t('tournamentDraft.moveDown', { name: entry.name })}
                            onClick={onDown}
                        >
                            <ChevronDown />
                        </Button>
                    </span>
                    {teams && (
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy}
                            aria-label={t('tournamentDraft.rename', { name: entry.name })}
                            onClick={onRename}
                        >
                            <Pencil />
                        </Button>
                    )}
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={t('tournamentDraft.remove', { name: entry.name })}
                        onClick={onRemove}
                    >
                        <X />
                    </Button>
                </span>
            )}
        </li>
    );
}
