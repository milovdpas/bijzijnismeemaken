'use client';

import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/layout/app-logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';

/** One centred card on the paper, the logo above it, nothing else to click. */
export function PublicShell({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-dvh flex-col">
            <div className="absolute top-3 right-3">
                <ThemeToggle />
            </div>
            <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <AppLogo size="lg" />
                    <h1 className="text-2xl">{t('common.appName')}</h1>
                </div>
                <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
            </main>
        </div>
    );
}
