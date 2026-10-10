'use client';

import { ERROR_CODES } from '@bzim/types';
import { Link2Off, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useJoinByToken, useJoinPreview } from '@/hooks/queries/use-groups';
import { errorKey, isApiError } from '@/lib/api/errors';
import { groupHref } from '@/lib/group-navigation';
import { inviteTokenFromSegment } from '@/lib/invite-link';

/**
 * What an invite link lands on. The token is the tail of the URL segment;
 * the slug in front of it is only there so the link reads well in a chat.
 * `AuthGate` has already sent a signed-out person through login and back.
 */
export function JoinView({ segment }: { segment: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const token = inviteTokenFromSegment(segment);
    const preview = useJoinPreview(token);
    const join = useJoinByToken();

    const invalid = token === null || isApiError(preview.error, ERROR_CODES.NOT_FOUND);

    if (invalid) {
        return (
            <EmptyState
                icon={Link2Off}
                titleKey="join.invalidTitle"
                descriptionKey="join.invalidDescription"
                action={
                    <Button variant="outline" nativeButton={false} render={<Link href="/groups" />}>
                        {t('group.backToGroups')}
                    </Button>
                }
            />
        );
    }
    if (preview.isError) {
        return <FormMessage tone="error">{t(errorKey(preview.error))}</FormMessage>;
    }
    if (preview.data === undefined) {
        return <div className="mx-auto h-48 max-w-md animate-pulse rounded-2xl bg-muted" />;
    }

    const group = preview.data;
    const accept = () => {
        join.mutate(token, {
            onSuccess: (joined) => router.push(groupHref(joined.id)),
            onError: (error) => {
                if (isApiError(error, ERROR_CODES.CONFLICT)) router.push(groupHref(group.id));
            },
        });
    };

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader>
                <CardDescription>{t('join.intro')}</CardDescription>
                <CardTitle className="text-2xl">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {group.description !== null && (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
                <p className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                    <Users className="size-4" />
                    {t('groups.members', { count: group.memberCount })}
                </p>
                {group.alreadyMember && (
                    <FormMessage tone="success">{t('join.alreadyMember')}</FormMessage>
                )}
                {join.isError && !isApiError(join.error, ERROR_CODES.CONFLICT) && (
                    <FormMessage tone="error">{t(errorKey(join.error))}</FormMessage>
                )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" nativeButton={false} render={<Link href="/groups" />}>
                    {t('group.backToGroups')}
                </Button>
                {group.alreadyMember ? (
                    <Button nativeButton={false} render={<Link href={groupHref(group.id)} />}>
                        {t('join.open')}
                    </Button>
                ) : (
                    <Button onClick={accept} disabled={join.isPending}>
                        {t('join.join')}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
