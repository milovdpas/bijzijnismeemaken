'use client';

import { useTranslation } from 'react-i18next';

import { ApiStatusCard } from '@/components/common/api-status-card';
import { HydrationGate } from '@/components/common/hydration-gate';
import { PageHeader } from '@/components/common/page-header';
import { AppearanceCard } from '@/components/settings/appearance-card';
import { LanguageCard } from '@/components/settings/language-card';
import { APP_VERSION } from '@/lib/site';

/**
 * Device settings only for now (theme, language). Profile, notification and
 * calendar settings arrive with their tasks and slot in as further cards.
 */
export function SettingsView() {
    const { t } = useTranslation();

    return (
        <>
            <PageHeader titleKey="settings.title" subtitleKey="settings.subtitle" />
            <HydrationGate>
                <div className="grid gap-4 md:grid-cols-2">
                    <AppearanceCard />
                    <LanguageCard />
                    <ApiStatusCard />
                </div>
            </HydrationGate>
            <p className="mt-8 text-center text-xs text-muted-foreground">
                {t('settings.version', { version: APP_VERSION })}
            </p>
        </>
    );
}
