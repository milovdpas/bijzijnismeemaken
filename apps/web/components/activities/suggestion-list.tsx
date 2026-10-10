'use client';

import type { Daypart, SuggestionDto } from '@bzim/types';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { useSuggestions } from '@/hooks/queries/use-activities';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { errorKey } from '@/lib/api/errors';
import { describeOccurrence } from '@/lib/occurrence-format';
import { cn } from '@/lib/utils';

const FIRST = 6;

/**
 * The best moments for the people switched on in the dialog, best first.
 * A tap fills the date and daypart. Follows the participant switches with
 * a short delay, so flipping three people costs one request, not three.
 */
export function SuggestionList({
    groupId,
    activityId,
    memberIds,
    selected,
    onPick,
}: {
    groupId: string;
    activityId: string;
    memberIds: string[];
    selected: { date: string; daypart: Daypart | null };
    onPick: (date: string, daypart: Daypart) => void;
}) {
    const { t, i18n } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const settled = useDebouncedValue(memberIds, 400);
    const suggestions = useSuggestions(groupId, activityId, settled);

    if (suggestions.isError) {
        return <FormMessage tone="error">{t(errorKey(suggestions.error))}</FormMessage>;
    }
    if (suggestions.data === undefined) {
        return <div className="h-20 animate-pulse rounded-xl bg-muted" />;
    }
    const items = suggestions.data.items;
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('suggestions.none')}</p>;
    }
    const total = suggestions.data.memberIds.length;
    const shown = showAll ? items : items.slice(0, FIRST);

    const isSelected = (item: SuggestionDto) =>
        item.date === selected.date && item.daypart === selected.daypart;

    return (
        <div className={cn('grid gap-1.5', suggestions.isPlaceholderData && 'opacity-60')}>
            {shown.map((item) => (
                <button
                    key={`${item.date}-${item.daypart}`}
                    type="button"
                    onClick={() => onPick(item.date, item.daypart)}
                    aria-pressed={isSelected(item)}
                    className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                        isSelected(item)
                            ? 'border-brand bg-brand/15'
                            : 'hover:bg-accent hover:text-foreground',
                    )}
                >
                    <Sparkles className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate capitalize">
                        {describeOccurrence(
                            item.date,
                            item.daypart,
                            null,
                            i18n.language,
                            (daypart) => t(`dayparts.${daypart}`),
                        )}
                    </span>
                    {item.conflict && (
                        <AlertTriangle
                            className="size-4 shrink-0 text-busy"
                            aria-label={t('suggestions.conflict')}
                        />
                    )}
                    <span
                        className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                            item.freeCount === total
                                ? 'bg-free/40'
                                : item.freeCount === 0
                                  ? 'bg-busy/30'
                                  : 'bg-brand/40',
                        )}
                    >
                        {t('suggestions.freeOf', { free: item.freeCount, total })}
                    </span>
                </button>
            ))}
            {items.length > FIRST && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => setShowAll((value) => !value)}
                >
                    {showAll
                        ? t('suggestions.showFewer')
                        : t('suggestions.showMore', { count: items.length - FIRST })}
                </Button>
            )}
        </div>
    );
}
