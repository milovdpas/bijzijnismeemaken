'use client';

import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { goToCalendarConnect } from '@/lib/api/calendar';

/**
 * The choice that decides the scope, made before the Google round trip:
 * reading the calendar only, or also writing planned activities into it.
 * Asked here so one consent covers both and nobody signs in twice.
 */
export function ConnectChoice({ returnTo }: { returnTo?: string }) {
    const { t } = useTranslation();
    const id = useId();
    const [withWrite, setWithWrite] = useState(false);

    return (
        <div className="space-y-4">
            <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
                <Switch
                    id={id}
                    checked={withWrite}
                    onCheckedChange={setWithWrite}
                    className="mt-0.5"
                />
                <span className="space-y-1">
                    <span className="block font-semibold">{t('calendarSettings.autoAdd')}</span>
                    <span className="block text-muted-foreground">
                        {t('calendarSettings.autoAddHelp')}{' '}
                        {t('calendarSettings.connectChoiceHint')}
                    </span>
                </span>
            </label>
            <div className="flex justify-end">
                <Button
                    onClick={() =>
                        void goToCalendarConnect(withWrite ? 'readwrite' : 'read', returnTo)
                    }
                >
                    {t('calendarSettings.connectGoogle')}
                </Button>
            </div>
        </div>
    );
}
