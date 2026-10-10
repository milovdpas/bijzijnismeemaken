'use client';

import { Pencil, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { useActivity } from '@/hooks/queries/use-activities';

/** Stands in for the activity detail (task 21): the title, and the way to the edit form. */
export function ActivityPlaceholder({
    groupId,
    activityId,
}: {
    groupId: string;
    activityId: string;
}) {
    const { t } = useTranslation();
    const activity = useActivity(groupId, activityId);

    return (
        <div className="space-y-4">
            {activity.data !== undefined && <h2 className="text-xl">{activity.data.title}</h2>}
            <EmptyState
                icon={Sparkles}
                titleKey="activities.detailSoon"
                descriptionKey="group.comingSoon"
                action={
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/groups/${groupId}/activities/${activityId}/edit`} />}
                    >
                        <Pencil className="size-4" />
                        {t('activities.edit')}
                    </Button>
                }
            />
        </div>
    );
}
