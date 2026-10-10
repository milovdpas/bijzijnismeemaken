'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useMyInvites } from '@/hooks/queries/use-invites';

/** A yellow strip on the groups page while invitations are waiting; nothing otherwise. */
export function InvitesBanner() {
    const { t } = useTranslation();
    const invites = useMyInvites();
    const count = invites.data?.length ?? 0;

    if (count === 0) return null;

    return (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-brand-foreground">
            <Mail className="size-5 shrink-0" />
            <p className="flex-1 text-sm font-semibold">{t('myInvites.banner', { count })}</p>
            <Button
                size="sm"
                variant="secondary"
                nativeButton={false}
                render={<Link href="/invites" />}
            >
                {t('myInvites.bannerAction')}
            </Button>
        </div>
    );
}
