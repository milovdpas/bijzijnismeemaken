'use client';

import { ERROR_CODES } from '@bzim/types';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { AccessBadge } from '@/components/groups/access-badge';
import { ImageCredit } from '@/components/common/image-credit';
import { InviteLinkBadge } from '@/components/groups/invite-link-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGroup } from '@/hooks/queries/use-groups';
import { errorKey, isApiError } from '@/lib/api/errors';
import { GROUP_TABS, activeGroupTab, canSeeTab, groupHref } from '@/lib/group-navigation';
import { cn } from '@/lib/utils';

/**
 * The frame around every page inside a group: name, role, member count and
 * the tab row. The tab row scrolls sideways on phones rather than wrapping,
 * so it stays one line and the active pill is always findable at the top.
 */
export function GroupShell({ groupId, children }: { groupId: string; children: React.ReactNode }) {
    const { t } = useTranslation();
    const pathname = usePathname();
    const group = useGroup(groupId);

    if (
        isApiError(group.error, ERROR_CODES.NOT_FOUND) ||
        isApiError(group.error, ERROR_CODES.FORBIDDEN)
    ) {
        return (
            <EmptyState
                icon={Users}
                titleKey="group.notFoundTitle"
                descriptionKey="group.notFoundDescription"
                action={
                    <Button variant="outline" nativeButton={false} render={<Link href="/groups" />}>
                        <ArrowLeft className="size-4" />
                        {t('group.backToGroups')}
                    </Button>
                }
            />
        );
    }
    if (group.isError) {
        return <FormMessage tone="error">{t(errorKey(group.error))}</FormMessage>;
    }
    if (group.data === undefined) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
                <div className="h-9 animate-pulse rounded-full bg-muted" />
                <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            </div>
        );
    }

    const active = activeGroupTab(pathname, groupId);

    return (
        <>
            <header className="mb-4">
                <Link
                    href="/groups"
                    className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" />
                    {t('groups.title')}
                </Link>
                {group.data.imageUrl !== null && (
                    <div className="mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host; next/image needs a fixed allow-list */}
                        <img
                            src={group.data.imageUrl}
                            alt=""
                            className="aspect-[3/1] w-full rounded-2xl object-cover"
                        />
                        {group.data.imageCreditName !== null && (
                            <ImageCredit
                                credit={{
                                    name: group.data.imageCreditName,
                                    url: group.data.imageCreditUrl ?? '',
                                }}
                            />
                        )}
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl">{group.data.name}</h1>
                    {group.data.role !== 'member' && (
                        <Badge variant="secondary">{t(`role.${group.data.role}`)}</Badge>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="size-3.5" />
                        {t('groups.members', { count: group.data.memberCount })}
                    </span>
                    {group.data.inviteLink !== null ? (
                        <InviteLinkBadge link={group.data.inviteLink} />
                    ) : (
                        <AccessBadge access={group.data.access} />
                    )}
                </div>
            </header>

            <nav
                aria-label={group.data.name}
                className="-mx-4 mb-6 flex gap-1 overflow-x-auto pb-1 pl-4 [scrollbar-width:none] after:block after:w-4 after:shrink-0 after:content-[''] md:mx-0 md:pl-0 md:after:hidden"
            >
                {GROUP_TABS.filter((item) => canSeeTab(item, group.data.role)).map(
                    ({ tab, labelKey, icon: Icon }) => (
                        <Link
                            key={tab}
                            href={groupHref(groupId, tab)}
                            aria-current={active === tab ? 'page' : undefined}
                            className={cn(
                                'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                                active === tab
                                    ? 'bg-ink text-ink-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                            {t(labelKey)}
                        </Link>
                    ),
                )}
            </nav>

            {children}
        </>
    );
}
