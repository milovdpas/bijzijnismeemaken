'use client';

import type { Daypart, GroupAvailabilityResponse, GroupOccurrenceDto } from '@bzim/types';
import { CalendarOff, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { CATEGORY_ICONS } from '@/lib/activity-categories';
import { freeIds, occurrencesInCell } from '@/lib/group-availability';
import { cn } from '@/lib/utils';
import { describeOccurrence } from '@/lib/occurrence-format';

/** One cell opened: who is free, who is not, and what is already planned then. */
export function CellSheet({
    groupId,
    cell,
    availability,
    occurrences,
    onClose,
}: {
    groupId: string;
    cell: { date: string; daypart: Daypart } | null;
    availability: GroupAvailabilityResponse;
    occurrences: GroupOccurrenceDto[];
    onClose: () => void;
}) {
    const { t, i18n } = useTranslation();
    if (cell === null) return null;

    const day = availability.days.find((entry) => entry.date === cell.date);
    const userIds = availability.users.map(({ user }) => user.id);
    const free = new Set(day === undefined ? [] : freeIds(day, cell.daypart, userIds));
    const planned = occurrencesInCell(occurrences, cell.date, cell.daypart);
    const title = describeOccurrence(cell.date, cell.daypart, null, i18n.language, (daypart) =>
        t(`dayparts.${daypart}`),
    );

    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                    <SheetTitle className="capitalize">{title}</SheetTitle>
                    <SheetDescription>
                        {t('groupAvailability.freeOf', { free: free.size, total: userIds.length })}
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 px-4 pb-6">
                    {planned.length > 0 && (
                        <ul className="space-y-1">
                            {planned.map((occurrence) => {
                                const Icon = CATEGORY_ICONS[occurrence.activity.category];
                                return (
                                    <li key={occurrence.id}>
                                        <Link
                                            href={`/groups/${groupId}/activities/${occurrence.activity.id}`}
                                            className="flex items-center gap-2 rounded-xl bg-brand/15 px-3 py-2 text-sm font-semibold hover:bg-brand/30"
                                        >
                                            <Icon className="size-4" />
                                            {occurrence.activity.title}
                                            {occurrence.startTime !== null && (
                                                <span className="ml-auto text-xs text-muted-foreground">
                                                    {occurrence.startTime}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <ul className="divide-y rounded-xl border">
                        {availability.users.map(({ user, hasCalendar }) => {
                            const isFree = free.has(user.id);
                            return (
                                <li
                                    key={user.id}
                                    className="flex items-center gap-3 px-3 py-2 text-sm"
                                >
                                    <Avatar avatarKey={user.avatarKey} size="sm" />
                                    <span className="min-w-0 flex-1 truncate font-semibold">
                                        {user.displayName}
                                    </span>
                                    {!hasCalendar && (
                                        <CalendarOff
                                            className="size-3.5 text-muted-foreground"
                                            aria-label={t('groupAvailability.noCalendar')}
                                        />
                                    )}
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 text-xs font-semibold',
                                            isFree ? 'text-foreground' : 'text-busy',
                                        )}
                                    >
                                        {isFree ? (
                                            <Check className="size-3.5" />
                                        ) : (
                                            <X className="size-3.5" />
                                        )}
                                        {isFree
                                            ? t('groupAvailability.free')
                                            : t('groupAvailability.busy')}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </SheetContent>
        </Sheet>
    );
}
