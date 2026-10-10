'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resendVerification, verifyEmail } from '@/lib/api/auth';
import { errorKey } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';

/**
 * The page behind the emailed verification link. It verifies on arrival: a
 * successful call sets the session cookies, so the person lands straight in
 * onboarding. A dead link offers to send a fresh one.
 */
export function VerifyEmailView() {
    const { t } = useTranslation();
    const router = useRouter();
    const queryClient = useQueryClient();
    const token = useSearchParams().get('token') ?? '';
    const [error, setError] = useState<unknown>(null);
    const [email, setEmail] = useState('');
    const [resent, setResent] = useState(false);
    // React Strict Mode runs effects twice in development; the token is single
    // use, so the second run must not spend it.
    const started = useRef(false);

    useEffect(() => {
        if (started.current || token === '') return;
        started.current = true;
        verifyEmail(token)
            .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.me }))
            .then(() => router.replace('/onboarding'))
            .catch((caught: unknown) => setError(caught));
    }, [token, router, queryClient]);

    if (token !== '' && error === null) {
        return <p className="text-center text-sm text-muted-foreground">{t('verify.checking')}</p>;
    }

    return (
        <div className="space-y-4">
            <FormMessage tone="error">
                {t(token === '' ? 'errors.TOKEN_INVALID' : errorKey(error))}
            </FormMessage>
            {resent ? (
                <FormMessage tone="success">{t('login.resent')}</FormMessage>
            ) : (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void resendVerification(email.trim()).then(() => setResent(true));
                    }}
                    className="space-y-3"
                    noValidate
                >
                    <Field label={t('login.email')} help={t('verify.resendHelp')}>
                        <Input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </Field>
                    <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        disabled={email.trim() === ''}
                    >
                        {t('login.resendVerification')}
                    </Button>
                </form>
            )}
            <p className="text-center text-sm">
                <Link
                    href="/login"
                    className="text-muted-foreground underline-offset-2 hover:underline"
                >
                    {t('common.backToLogin')}
                </Link>
            </p>
        </div>
    );
}
