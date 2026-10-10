'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteAccount } from '@/hooks/queries/use-me';
import { errorKey } from '@/lib/api/errors';

/**
 * The way out for good. One button, one confirmation; refused by the API
 * while the person still owns a group, which the dialog explains.
 */
export function DeleteAccountCard() {
    const { t } = useTranslation();
    const router = useRouter();
    const remove = useDeleteAccount();
    const [confirming, setConfirming] = useState(false);

    return (
        <Card className="border-destructive/40">
            <CardHeader>
                <CardTitle>{t('settings.dangerTitle')}</CardTitle>
                <CardDescription>{t('settings.dangerDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={() => setConfirming(true)}>
                    <Trash2 />
                    {t('settings.deleteAccount')}
                </Button>
            </CardContent>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t('settings.deleteAccount')}
                description={t('settings.deleteAccountDescription')}
                confirmLabel={t('settings.deleteAccountConfirm')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() =>
                    remove.mutate(undefined, { onSuccess: () => router.replace('/login') })
                }
            />
        </Card>
    );
}
