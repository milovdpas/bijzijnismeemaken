'use client';

import { ERROR_CODES } from '@bzim/types';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { GroupCard } from '@/components/groups/group-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJoinGroup, usePublicGroups } from '@/hooks/queries/use-groups';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { errorKey, isApiError } from '@/lib/api/errors';
import { groupHref } from '@/lib/group-navigation';

/**
 * Search and join public groups. Typing resets to page one; a join opens the
 * group, and "already a member" counts as success because the outcome is the
 * same: the person belongs there.
 */
export function DiscoverView() {
    const { t } = useTranslation();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebouncedValue(query.trim());
    const results = usePublicGroups(q, page);
    const join = useJoinGroup();
    const [joiningId, setJoiningId] = useState<string | null>(null);

    const joinOne = (groupId: string) => {
        setJoiningId(groupId);
        join.mutate(groupId, {
            onSuccess: (group) => router.push(groupHref(group.id)),
            onError: (error) => {
                if (isApiError(error, ERROR_CODES.CONFLICT)) router.push(groupHref(groupId));
            },
            onSettled: () => setJoiningId(null),
        });
    };

    return (
        <>
            <PageHeader titleKey="discover.title" subtitleKey="discover.subtitle" />

            <div className="relative mb-4">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    className="pl-9"
                    placeholder={t('discover.search')}
                    aria-label={t('discover.search')}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(1);
                    }}
                />
            </div>

            {results.isPending && (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                </div>
            )}
            {results.isError && (
                <FormMessage tone="error">{t(errorKey(results.error))}</FormMessage>
            )}
            {join.isError && !isApiError(join.error, ERROR_CODES.CONFLICT) && (
                <FormMessage tone="error" className="mb-4">
                    {t(errorKey(join.error))}
                </FormMessage>
            )}

            {results.data !== undefined &&
                (results.data.items.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        titleKey="discover.emptyTitle"
                        descriptionKey="discover.emptyDescription"
                    />
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {results.data.items.map((group) => (
                            <GroupCard
                                key={group.id}
                                name={group.name}
                                description={group.description}
                                imageUrl={group.imageUrl}
                                memberCount={group.memberCount}
                                action={
                                    <Button
                                        size="sm"
                                        disabled={join.isPending}
                                        onClick={() => joinOne(group.id)}
                                    >
                                        {joiningId === group.id
                                            ? t('common.loading')
                                            : t('discover.join')}
                                    </Button>
                                }
                            />
                        ))}
                    </div>
                ))}

            {results.data !== undefined && (
                <Pagination
                    className="mt-6"
                    page={page}
                    hasMore={results.data.hasMore}
                    onPageChange={setPage}
                />
            )}
        </>
    );
}
