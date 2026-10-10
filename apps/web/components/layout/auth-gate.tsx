'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useMe } from '@/hooks/queries/use-me';
import { ApiError, setUnauthenticatedHandler } from '@/lib/api/client';
import { usePreferencesStore } from '@/store/use-preferences-store';

const ONBOARDING = '/onboarding';

/**
 * Who is here, and whether they may be.
 *
 * Signed out: to the login page, remembering where they were going. Signed
 * in but not onboarded: to onboarding, and nowhere else until it is done.
 * Onboarded and on the onboarding page: to the groups. While the answer is
 * on its way, a skeleton rather than a flash of the wrong screen.
 *
 * Also the place where the profile's language wins over the device's: the
 * server copy is what the emails use, so the app follows it.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const me = useMe();
    const locale = usePreferencesStore((s) => s.locale);
    const setLocale = usePreferencesStore((s) => s.setLocale);

    useEffect(() => {
        setUnauthenticatedHandler(() => router.replace(loginUrl(pathname)));
    }, [router, pathname]);

    const signedOut = me.isError && me.error instanceof ApiError && me.error.status === 401;
    const needsOnboarding = me.data !== undefined && !me.data.onboardingDone;
    const onOnboarding = pathname === ONBOARDING;

    useEffect(() => {
        if (signedOut) router.replace(loginUrl(pathname));
        else if (needsOnboarding && !onOnboarding) router.replace(ONBOARDING);
        else if (me.data?.onboardingDone && onOnboarding) router.replace('/groups');
    }, [signedOut, needsOnboarding, onOnboarding, me.data?.onboardingDone, router, pathname]);

    useEffect(() => {
        if (me.data !== undefined && me.data.locale !== locale) setLocale(me.data.locale);
    }, [me.data, locale, setLocale]);

    if (me.data === undefined || (needsOnboarding && !onOnboarding)) {
        return (
            <div className="space-y-4 py-2">
                <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
                <div className="h-48 animate-pulse rounded-xl bg-muted" />
            </div>
        );
    }
    return <>{children}</>;
}

function loginUrl(returnTo: string): string {
    return returnTo === '/' || returnTo === '/groups'
        ? '/login'
        : `/login?returnTo=${encodeURIComponent(returnTo)}`;
}
