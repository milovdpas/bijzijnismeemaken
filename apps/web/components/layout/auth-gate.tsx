'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AppLogo } from '@/components/layout/app-logo';
import { useMe } from '@/hooks/queries/use-me';
import { rememberDestination, takeDestination } from '@/lib/after-setup';
import { ApiError, setUnauthenticatedHandler } from '@/lib/api/client';
import { usePreferencesStore } from '@/store/use-preferences-store';

const ONBOARDING = '/onboarding';

/**
 * Who is here, and whether they may be.
 *
 * Signed out: to the login page, remembering where they were going. Signed
 * in but not onboarded: to onboarding, and nowhere else until it is done;
 * the page they were on (an invite link) waits on the device until the
 * welcome steps are through. Onboarded and on the onboarding page: on to
 * that page or the groups. While the answer is on its way, a skeleton
 * rather than a flash of the wrong screen.
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
    const onboardingDone = me.data?.onboardingDone === true;
    const calendarSeen = me.data?.setup.calendarSeen === true;

    useEffect(() => {
        if (signedOut) router.replace(loginUrl(pathname));
        else if (needsOnboarding && !onOnboarding) {
            rememberDestination(pathname);
            router.replace(ONBOARDING);
        } else if (onboardingDone && onOnboarding) {
            // Profile done: on to the optional steps, unless they were seen already.
            router.replace(calendarSeen ? (takeDestination() ?? '/groups') : '/welcome/calendar');
        }
    }, [signedOut, needsOnboarding, onOnboarding, onboardingDone, calendarSeen, router, pathname]);

    useEffect(() => {
        if (me.data !== undefined && me.data.locale !== locale) setLocale(me.data.locale);
    }, [me.data, locale, setLocale]);

    // Nothing of the app until the session is known: a signed-out person must
    // never glimpse the shell on their way to the login page. The logo alone,
    // on the plain background, looks the same as the first frame of either
    // destination, so there is no jump whichever way it goes.
    if (me.data === undefined || (needsOnboarding && !onOnboarding)) {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <AppLogo size="lg" className="animate-pulse" />
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
