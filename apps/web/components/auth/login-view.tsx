'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { safeReturnTo } from '@/lib/return-to';

import { GoogleButton } from '@/components/auth/google-button';
import { RegisterForm } from '@/components/auth/register-form';
import { SignInForm } from '@/components/auth/sign-in-form';
import { FormMessage } from '@/components/common/form-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/** The reasons the API can send the browser back here with. */
const GOOGLE_ERRORS: Record<string, string> = {
    google_cancelled: 'login.googleCancelled',
    google_state: 'login.googleState',
    google_failed: 'login.googleFailed',
};

/**
 * Sign in or create an account. Google first, because it is one click; the
 * email form underneath for everyone else. `returnTo` survives both routes.
 */
export function LoginView() {
    const { t } = useTranslation();
    const params = useSearchParams();
    const returnTo = safeReturnTo(params.get('returnTo'));
    const googleError = GOOGLE_ERRORS[params.get('error') ?? ''];
    const [tab, setTab] = useState<'sign-in' | 'register'>(
        params.get('register') === '1' ? 'register' : 'sign-in',
    );

    return (
        <div className="space-y-5">
            {googleError !== undefined && <FormMessage tone="error">{t(googleError)}</FormMessage>}

            <GoogleButton returnTo={returnTo} />

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {t('login.or')}
                <span className="h-px flex-1 bg-border" />
            </div>

            <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
                <TabsList className="w-full">
                    <TabsTrigger value="sign-in" className="flex-1">
                        {t('login.signIn')}
                    </TabsTrigger>
                    <TabsTrigger value="register" className="flex-1">
                        {t('login.createAccount')}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="sign-in" className="pt-4">
                    <SignInForm returnTo={returnTo} />
                </TabsContent>
                <TabsContent value="register" className="pt-4">
                    <RegisterForm />
                </TabsContent>
            </Tabs>
        </div>
    );
}
