'use client';

import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const UNSPLASH = 'https://unsplash.com/?utm_source=bij_zijn_is_meemaken&utm_medium=referral';

/** "Photo by Name on Unsplash", both linked, as Unsplash asks wherever one of their photos shows. */
export function ImageCredit({
    credit,
    className,
}: {
    credit: { name: string; url: string };
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <p className={cn('text-[11px] text-muted-foreground', className)}>
            {t('imageField.creditBy')}{' '}
            <a href={credit.url} target="_blank" rel="noreferrer" className="underline">
                {credit.name}
            </a>{' '}
            {t('imageField.creditOn')}{' '}
            <a href={UNSPLASH} target="_blank" rel="noreferrer" className="underline">
                Unsplash
            </a>
        </p>
    );
}
