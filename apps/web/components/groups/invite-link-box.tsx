'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCopy } from '@/hooks/use-copy';
import { cn } from '@/lib/utils';

/** The invite link, read-only, with one button that copies it. */
export function InviteLinkBox({ link, className }: { link: string; className?: string }) {
    const { t } = useTranslation();
    const { copied, copy } = useCopy();

    return (
        <div className={cn('flex gap-2', className)}>
            <Input
                readOnly
                value={link}
                aria-label={t('invite.link')}
                onFocus={(event) => event.target.select()}
                className="font-mono text-xs"
            />
            <Button
                type="button"
                variant={copied ? 'secondary' : 'default'}
                onClick={() => copy(link)}
            >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t('invite.copied') : t('invite.copy')}
            </Button>
        </div>
    );
}
