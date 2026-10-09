'use client';

import { Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';

/**
 * Placeholder until task 15 brings the real list. It shows the empty state the
 * real view will use, so the design can be judged on a screen that looks like
 * one a new member sees.
 */
export function GroupsView() {
    const { t } = useTranslation();

    return (
        <>
            <PageHeader
                titleKey="groups.title"
                subtitleKey="groups.subtitle"
                action={
                    <Button disabled>
                        <Plus className="size-4" />
                        {t('groups.create')}
                    </Button>
                }
            />
            <EmptyState
                icon={Users}
                titleKey="groups.emptyTitle"
                descriptionKey="groups.emptyDescription"
                action={
                    <Button disabled>
                        <Plus className="size-4" />
                        {t('groups.create')}
                    </Button>
                }
            />
        </>
    );
}
