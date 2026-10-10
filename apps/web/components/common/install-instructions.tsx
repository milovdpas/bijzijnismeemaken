'use client';

import { Download, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { InstallMethod } from '@/lib/pwa';

/**
 * How to put the app on the home screen, said once and used by both the
 * settings card and the one-time prompt: a real install button where the
 * browser offers one, the share-sheet steps on iOS, the menu hint elsewhere.
 */
export function InstallInstructions({
    method,
    onPrompt,
    pending = false,
}: {
    method: InstallMethod;
    onPrompt: () => void;
    pending?: boolean;
}) {
    const { t } = useTranslation();

    switch (method) {
        case 'prompt':
            return (
                <Button disabled={pending} onClick={onPrompt}>
                    <Download />
                    {t('install.button')}
                </Button>
            );
        case 'ios':
            return (
                <ol className="list-inside list-decimal space-y-1 text-sm">
                    <li>
                        {t('install.iosShare')}{' '}
                        <Share className="inline size-4 align-text-bottom" aria-hidden />
                    </li>
                    <li>{t('install.iosAdd')}</li>
                </ol>
            );
        case 'menu':
            return <p className="text-sm">{t('install.menu')}</p>;
    }
}
