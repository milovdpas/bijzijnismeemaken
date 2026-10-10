'use client';

import { ActivityLabel } from '@bzim/types';
import { Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityCard } from '@/components/activities/activity-card';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { useActivities } from '@/hooks/queries/use-activities';
import { errorKey } from '@/lib/api/errors';
import type { ActivityFilters } from '@/lib/api/activities';
import { cn } from '@/lib/utils';

const LABELS: readonly (ActivityLabel | 'all')[] = [
    'all',
    ActivityLabel.IDEA,
    ActivityLabel.PLANNED,
    ActivityLabel.DONE,
];

/** A row of pills; the chosen one is yellow. Used for both filters so they look the same. */
function Pills<T extends string>({
    options,
    value,
    labelFor,
    onChange,
    ariaLabel,
}: {
    options: readonly T[];
    value: T;
    labelFor: (option: T) => string;
    onChange: (option: T) => void;
    ariaLabel: string;
}) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={value === option}
                    onClick={() => onChange(option)}
                    className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                        value === option
                            ? 'bg-brand text-brand-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                >
                    {labelFor(option)}
                </button>
            ))}
        </div>
    );
}

/** The group's activities: filter by state, sort by date or by newest, add a new one. */
export function ActivitiesView({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const [label, setLabel] = useState<ActivityLabel | 'all'>('all');
    const [sort, setSort] = useState<ActivityFilters['sort']>('next');
    const activities = useActivities(groupId, {
        label: label === 'all' ? undefined : label,
        sort,
    });
    const newHref = `/groups/${groupId}/activities/new`;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Pills
                    options={LABELS}
                    value={label}
                    labelFor={(option) =>
                        option === 'all' ? t('activities.filterAll') : t(`labels.${option}`)
                    }
                    onChange={setLabel}
                    ariaLabel={t('activities.filterLabel')}
                />
                <div className="flex items-center gap-3">
                    <Pills
                        options={['next', 'newest'] as const}
                        value={sort}
                        labelFor={(option) =>
                            option === 'next'
                                ? t('activities.sortNext')
                                : t('activities.sortNewest')
                        }
                        onChange={setSort}
                        ariaLabel={t('activities.sortLabel')}
                    />
                    <Button nativeButton={false} render={<Link href={newHref} />}>
                        <Plus className="size-4" />
                        {t('activities.new')}
                    </Button>
                </div>
            </div>

            {activities.isPending && (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                </div>
            )}
            {activities.isError && (
                <FormMessage tone="error">{t(errorKey(activities.error))}</FormMessage>
            )}
            {activities.data !== undefined &&
                (activities.data.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        titleKey={
                            label === 'all'
                                ? 'activities.emptyTitle'
                                : 'activities.emptyFilterTitle'
                        }
                        descriptionKey={label === 'all' ? 'activities.emptyDescription' : undefined}
                        action={
                            label === 'all' ? (
                                <Button nativeButton={false} render={<Link href={newHref} />}>
                                    <Plus className="size-4" />
                                    {t('activities.new')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div
                        className={cn(
                            'grid gap-3 md:grid-cols-2',
                            activities.isPlaceholderData && 'opacity-60',
                        )}
                    >
                        {activities.data.map((activity) => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                href={`/groups/${groupId}/activities/${activity.id}`}
                            />
                        ))}
                    </div>
                ))}
        </div>
    );
}
