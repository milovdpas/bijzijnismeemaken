'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ERROR_CODES } from '@bzim/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login, resendVerification } from '@/lib/api/auth';
import { errorKey, isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';

interface FormState {
    email: string;
    password: string;
}

const blank: FormState = { email: '', password: '' };

export function SignInForm({ returnTo }: { returnTo?: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FormState>(blank);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [resent, setResent] = useState(false);

    const canSubmit = form.email.trim() !== '' && form.password !== '' && !busy;
    const unverified = isApiError(error, ERROR_CODES.EMAIL_NOT_VERIFIED);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        try {
            await login(form.email.trim(), form.password);
            // The next screen reads `me`; a stale "signed out" answer must not win.
            await queryClient.invalidateQueries({ queryKey: queryKeys.me });
            router.replace(returnTo ?? '/groups');
        } catch (caught) {
            setError(caught);
            setBusy(false);
        }
    };

    const resend = async () => {
        await resendVerification(form.email.trim());
        setResent(true);
    };

    return (
        <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
            <Field label={t('login.email')}>
                <Input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
            </Field>
            <Field label={t('login.password')}>
                <Input
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
            </Field>

            {error !== null && (
                <FormMessage tone="error">
                    {t(errorKey(error))}
                    {unverified && !resent && (
                        <button
                            type="button"
                            onClick={() => void resend()}
                            className="ml-1 font-semibold underline underline-offset-2"
                        >
                            {t('login.resendVerification')}
                        </button>
                    )}
                    {unverified && resent && <span className="ml-1">{t('login.resent')}</span>}
                </FormMessage>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                {t('login.signIn')}
            </Button>

            <p className="text-center text-sm">
                <Link
                    href="/forgot-password"
                    className="text-muted-foreground underline-offset-2 hover:underline"
                >
                    {t('login.forgot')}
                </Link>
            </p>
        </form>
    );
}
