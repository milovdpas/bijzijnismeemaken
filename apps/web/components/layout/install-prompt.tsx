'use client';

import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/layout/app-logo';
import { InstallInstructions } from '@/components/common/install-instructions';
import { Button } from '@/components/ui/button';
import { useInstallApp } from '@/hooks/use-install-app';
import { usePreferencesStore } from '@/store/use-preferences-store';

/**
 * One nudge to install, shown once per browser and never again after it is
 * closed, accepted or seen installed. Stays off the onboarding screens, which
 * have enough to ask already.
 */
export function InstallPrompt() {
    const { t } = useTranslation();
    const pathname = usePathname();
    const install = useInstallApp();
    const hydrated = usePreferencesStore((state) => state.hydrated);
    const seen = usePreferencesStore((state) => state.installPromptSeen);
    const dismiss = usePreferencesStore((state) => state.setInstallPromptSeen);

    if (!hydrated || seen || install.installed || pathname.startsWith('/onboarding')) return null;

    return (
        <div
            role="dialog"
            aria-label={t('install.title')}
            className="fixed inset-x-4 bottom-[calc(var(--h-bottomnav)_+_1rem)] z-40 rounded-2xl border bg-card p-4 shadow-lg md:right-6 md:bottom-6 md:left-auto md:w-96"
        >
            <div className="flex items-start gap-3">
                <AppLogo size="sm" />
                <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-bold">{t('install.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('install.description')}</p>
                    <InstallInstructions
                        method={install.method}
                        onPrompt={() => {
                            void install.prompt().finally(dismiss);
                        }}
                    />
                </div>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('common.close')}
                    onClick={dismiss}
                >
                    <X />
                </Button>
            </div>
        </div>
    );
}
