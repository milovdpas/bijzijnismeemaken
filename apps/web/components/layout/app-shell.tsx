'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/layout/app-logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NAV_ITEMS, isActiveNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * The chrome around every signed-in page.
 *
 * One top bar on every width: logo, name and (from md up) the section links.
 * On phones the sections move to a bottom bar within thumb reach, and the main
 * column reserves `--h-bottomnav` so the last card is never hidden behind it.
 * The active section is a filled ink pill, so it reads at a glance even on a
 * yellow-heavy screen.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { t } = useTranslation();

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-(--z-topbar) h-(--h-topbar) border-b bg-background/85 backdrop-blur">
                <div className="mx-auto flex h-full w-full max-w-5xl items-center gap-3 px-4 md:px-6">
                    <Link href="/groups" className="flex items-center gap-2.5">
                        <AppLogo size="sm" />
                        <span className="text-base font-bold text-ink">{t('common.appName')}</span>
                    </Link>

                    <nav className="ml-6 hidden items-center gap-1 md:flex">
                        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
                            const active = isActiveNav(pathname, href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                                        active
                                            ? 'bg-ink text-ink-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {t(labelKey)}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-(--h-bottomnav) pt-6 md:px-6 md:pt-8">
                {children}
            </main>

            <nav className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
                <div className="flex h-16">
                    {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
                        const active = isActiveNav(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold"
                            >
                                <span
                                    className={cn(
                                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                                        active
                                            ? 'bg-ink text-ink-foreground'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    <Icon className="size-5" />
                                </span>
                                <span className={active ? 'text-ink' : 'text-muted-foreground'}>
                                    {t(labelKey)}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
