'use client';

import { Compass, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { InvitesBanner } from '@/components/invites/invites-banner';
import { PageHeader } from '@/components/common/page-header';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { GroupCard } from '@/components/groups/group-card';
import { Button } from '@/components/ui/button';
import { useGroups } from '@/hooks/queries/use-groups';
import { errorKey } from '@/lib/api/errors';
import { groupHref } from '@/lib/group-navigation';

/** The person's own groups, newest membership first as the API orders them. */
export function GroupsView() {
    const { t } = useTranslation();
    const groups = useGroups();

    return (
        <>
            <PageHeader
                titleKey="groups.title"
                subtitleKey="groups.subtitle"
                action={<CreateGroupDialog />}
            />

            <InvitesBanner />

            {groups.isPending && (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                </div>
            )}
            {groups.isError && <FormMessage tone="error">{t(errorKey(groups.error))}</FormMessage>}

            {groups.data !== undefined &&
                (groups.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        titleKey="groups.emptyTitle"
                        descriptionKey="groups.emptyDescription"
                        action={<CreateGroupDialog />}
                    />
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {groups.data.map((group) => (
                            <GroupCard
                                key={group.id}
                                name={group.name}
                                description={group.description}
                                imageUrl={group.imageUrl}
                                memberCount={group.memberCount}
                                role={group.role}
                                href={groupHref(group.id)}
                            />
                        ))}
                    </div>
                ))}

            <div className="mt-8 flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">{t('groups.discoverHint')}</p>
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/groups/discover" />}
                >
                    <Compass className="size-4" />
                    {t('groups.discover')}
                </Button>
            </div>
        </>
    );
}
