'use client';

import { Check, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { badgeVariants } from '@/components/ui/badge';
import { useCopy } from '@/hooks/use-copy';
import { cn } from '@/lib/utils';

/**
 * The access chip an admin of an invite-link group sees: pressing it copies
 * the link. Same shape as `AccessBadge`, so the header does not jump between
 * roles; the hover and the icon flip say it is a button.
 */
export function InviteLinkBadge({ link, className }: { link: string; className?: string }) {
    const { t } = useTranslation();
    const { copied, copy } = useCopy();

    return (
        <button
            type="button"
            onClick={() => copy(link)}
            title={t('invite.copy')}
            className={cn(
                badgeVariants({ variant: copied ? 'secondary' : 'outline' }),
                'cursor-pointer hover:bg-muted',
                className,
            )}
        >
            {copied ? <Check data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
            {copied ? t('invite.copied') : t('invite.copyLink')}
        </button>
    );
}
