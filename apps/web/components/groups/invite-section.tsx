'use client';

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { FormMessage } from '@/components/common/form-message';
import { InviteByHandle } from '@/components/groups/invite-by-handle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCancelInvite, useGroupInvites } from '@/hooks/queries/use-invites';
import { errorKey } from '@/lib/api/errors';

/** For admins: send an invite, and see (or withdraw) the ones still open. */
export function InviteSection({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const pending = useGroupInvites(groupId);
    const cancel = useCancelInvite(groupId);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('members.inviteTitle')}</CardTitle>
                <CardDescription>{t('members.inviteDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <InviteByHandle groupId={groupId} />

                {pending.data !== undefined && pending.data.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                            {t('members.pendingTitle')}
                        </h3>
                        <ul className="divide-y rounded-xl border">
                            {pending.data.map((invite) => (
                                <li key={invite.id} className="flex items-center gap-3 px-3 py-2">
                                    <Avatar avatarKey={invite.invitedUser.avatarKey} size="sm" />
                                    <span className="min-w-0 flex-1 text-sm">
                                        <span className="block truncate font-semibold">
                                            {invite.invitedUser.displayName}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            @{invite.invitedUser.handle}
                                            {invite.invitedBy !== null &&
                                                ` · ${t('members.invitedBy', { name: invite.invitedBy.displayName })}`}
                                        </span>
                                    </span>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={t('members.cancelInvite')}
                                        disabled={cancel.isPending}
                                        onClick={() => cancel.mutate(invite.id)}
                                    >
                                        <X />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {cancel.isError && (
                    <FormMessage tone="error">{t(errorKey(cancel.error))}</FormMessage>
                )}
            </CardContent>
        </Card>
    );
}
