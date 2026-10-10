'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { InviteLinkBox } from '@/components/groups/invite-link-box';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useRegenerateInviteLink } from '@/hooks/queries/use-groups';
import { errorKey } from '@/lib/api/errors';

/** The current link, and the one-way door to a new one. */
export function InviteLinkCard({ groupId, link }: { groupId: string; link: string }) {
    const { t } = useTranslation();
    const regenerate = useRegenerateInviteLink(groupId);
    const [confirming, setConfirming] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('groupSettings.linkTitle')}</CardTitle>
                <CardDescription>{t('groupSettings.linkDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <InviteLinkBox link={link} />
            </CardContent>
            <CardFooter className="justify-end">
                <Button variant="outline" onClick={() => setConfirming(true)}>
                    <RefreshCw />
                    {t('groupSettings.newLink')}
                </Button>
            </CardFooter>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t('groupSettings.newLink')}
                description={t('groupSettings.newLinkDescription')}
                confirmLabel={t('groupSettings.newLink')}
                pending={regenerate.isPending}
                error={regenerate.isError ? t(errorKey(regenerate.error)) : null}
                onConfirm={() =>
                    regenerate.mutate(undefined, { onSuccess: () => setConfirming(false) })
                }
            />
        </Card>
    );
}
