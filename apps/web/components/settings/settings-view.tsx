'use client';

import { useTranslation } from 'react-i18next';

import { ApiStatusCard } from '@/components/common/api-status-card';
import { HydrationGate } from '@/components/common/hydration-gate';
import { PageHeader } from '@/components/common/page-header';
import { AccountCard } from '@/components/settings/account-card';
import { AppearanceCard } from '@/components/settings/appearance-card';
import { CalendarCard } from '@/components/settings/calendar-card';
import { DeleteAccountCard } from '@/components/settings/delete-account-card';
import { InstallAppCard } from '@/components/settings/install-app-card';
import { LanguageCard } from '@/components/settings/language-card';
import { NotificationsCard } from '@/components/settings/notifications-card';
import { PasswordCard } from '@/components/settings/password-card';
import { ProfileCard } from '@/components/settings/profile-card';
import { useMe } from '@/hooks/queries/use-me';
import { APP_VERSION } from '@/lib/site';

/**
 * Profile, sign-in, device preferences. `AuthGate` guarantees `me` is loaded
 * before this renders, so the cards can take it as a plain prop.
 */
export function SettingsView() {
    const { t } = useTranslation();
    const me = useMe();

    return (
        <>
            <PageHeader titleKey="settings.title" subtitleKey="settings.subtitle" />
            <HydrationGate>
                <div className="grid gap-4 md:grid-cols-2">
                    {me.data !== undefined && (
                        <>
                            <ProfileCard key={me.data.handle ?? 'profile'} me={me.data} />
                            <AccountCard me={me.data} />
                            <PasswordCard me={me.data} />
                            <CalendarCard />
                            <NotificationsCard />
                        </>
                    )}
                    <AppearanceCard />
                    <LanguageCard />
                    <InstallAppCard />
                    <ApiStatusCard />
                    <DeleteAccountCard />
                </div>
            </HydrationGate>
            <p className="mt-8 text-center text-xs text-muted-foreground">
                {t('settings.version', { version: APP_VERSION })}
            </p>
        </>
    );
}
