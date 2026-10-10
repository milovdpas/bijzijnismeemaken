'use client';

import { Mail, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { useAcceptInvite, useDeclineInvite, useMyInvites } from '@/hooks/queries/use-invites';
import { errorKey } from '@/lib/api/errors';
import { groupHref } from '@/lib/group-navigation';

/** The invitations waiting for the signed-in person. Accepting opens the group. */
export function MyInvitesView() {
    const { t } = useTranslation();
    const router = useRouter();
    const invites = useMyInvites();
    const accept = useAcceptInvite();
    const decline = useDeclineInvite();
    const [busyId, setBusyId] = useState<string | null>(null);

    const answer = (inviteId: string, yes: boolean) => {
        setBusyId(inviteId);
        if (yes) {
            accept.mutate(inviteId, {
                onSuccess: (group) => router.push(groupHref(group.id)),
                onSettled: () => setBusyId(null),
            });
        } else {
            decline.mutate(inviteId, { onSettled: () => setBusyId(null) });
        }
    };

    const error = accept.error ?? decline.error;

    return (
        <>
            <PageHeader titleKey="myInvites.title" subtitleKey="myInvites.subtitle" />

            {invites.isPending && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}
            {invites.isError && (
                <FormMessage tone="error">{t(errorKey(invites.error))}</FormMessage>
            )}
            {error !== null && (
                <FormMessage tone="error" className="mb-4">
                    {t(errorKey(error))}
                </FormMessage>
            )}

            {invites.data !== undefined &&
                (invites.data.length === 0 ? (
                    <EmptyState
                        icon={Mail}
                        titleKey="myInvites.emptyTitle"
                        descriptionKey="myInvites.emptyDescription"
                    />
                ) : (
                    <ul className="grid gap-3 md:grid-cols-2">
                        {invites.data.map((invite) => (
                            <li
                                key={invite.id}
                                className="rounded-2xl border bg-card p-4 shadow-sm"
                            >
                                <h2 className="truncate text-lg">{invite.group.name}</h2>
                                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Users className="size-4" />
                                    {invite.invitedBy !== null
                                        ? t('members.invitedBy', {
                                              name: invite.invitedBy.displayName,
                                          })
                                        : t('myInvites.invitedByNobody')}
                                </p>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={busyId === invite.id}
                                        onClick={() => answer(invite.id, false)}
                                    >
                                        {t('myInvites.decline')}
                                    </Button>
                                    <Button
                                        disabled={busyId === invite.id}
                                        onClick={() => answer(invite.id, true)}
                                    >
                                        {t('myInvites.accept')}
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ))}
        </>
    );
}
