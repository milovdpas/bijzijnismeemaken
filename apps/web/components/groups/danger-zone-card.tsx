'use client';

import type { GroupDetailResponse } from '@bzim/types';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteGroup } from '@/hooks/queries/use-groups';
import { errorKey } from '@/lib/api/errors';

/** Owner only. One button, one confirmation, and the group is gone. */
export function DangerZoneCard({ group }: { group: GroupDetailResponse }) {
    const { t } = useTranslation();
    const router = useRouter();
    const remove = useDeleteGroup(group.id);
    const [confirming, setConfirming] = useState(false);

    return (
        <Card className="border-destructive/40">
            <CardHeader>
                <CardTitle>{t('groupSettings.dangerTitle')}</CardTitle>
                <CardDescription>{t('groupSettings.dangerDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={() => setConfirming(true)}>
                    <Trash2 />
                    {t('groupSettings.deleteGroup')}
                </Button>
            </CardContent>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t('groupSettings.deleteGroup')}
                description={t('groupSettings.deleteDescription', { name: group.name })}
                confirmLabel={t('groupSettings.deleteGroup')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() =>
                    remove.mutate(undefined, { onSuccess: () => router.push('/groups') })
                }
            />
        </Card>
    );
}
