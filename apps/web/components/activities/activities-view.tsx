'use client';

import { ActivityLabel } from '@bzim/types';
import { Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityCard } from '@/components/activities/activity-card';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { PillGroup } from '@/components/common/pill-group';
import { Button } from '@/components/ui/button';
import { useActivities } from '@/hooks/queries/use-activities';
import { errorKey } from '@/lib/api/errors';
import type { ActivityFilters } from '@/lib/api/activities';

const LABELS: readonly (ActivityLabel | 'all')[] = [
    'all',
    ActivityLabel.IDEA,
    ActivityLabel.PLANNED,
    ActivityLabel.DONE,
];

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
                <PillGroup
                    options={LABELS}
                    value={label}
                    labelFor={(option) =>
                        option === 'all' ? t('activities.filterAll') : t(`labels.${option}`)
                    }
                    onChange={setLabel}
                    ariaLabel={t('activities.filterLabel')}
                />
                <div className="flex items-center gap-3">
                    <PillGroup
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
                        className={
                            activities.isPlaceholderData
                                ? 'grid gap-3 opacity-60 md:grid-cols-2'
                                : 'grid gap-3 md:grid-cols-2'
                        }
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
