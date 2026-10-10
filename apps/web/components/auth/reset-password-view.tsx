'use client';

import { AUTH } from '@bzim/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/api/auth';
import { errorKey } from '@/lib/api/errors';

/** The page behind the emailed reset link. The token lives in the query string. */
export function ResetPasswordView() {
    const { t } = useTranslation();
    const token = useSearchParams().get('token') ?? '';
    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [done, setDone] = useState(false);

    const tooShort = password !== '' && password.length < AUTH.PASSWORD_MIN_LENGTH;
    const mismatch = repeat !== '' && repeat !== password;
    const canSubmit = password.length >= AUTH.PASSWORD_MIN_LENGTH && repeat === password && !busy;

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        try {
            await resetPassword(token, password);
            setDone(true);
        } catch (caught) {
            setError(caught);
        } finally {
            setBusy(false);
        }
    };

    if (token === '') {
        return (
            <div className="space-y-4">
                <FormMessage tone="error">{t('errors.TOKEN_INVALID')}</FormMessage>
                <BackToLogin label={t('common.backToLogin')} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg">{t('reset.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('reset.intro')}</p>
            </div>

            {done ? (
                <>
                    <FormMessage tone="success">{t('reset.done')}</FormMessage>
                    <Button size="lg" className="w-full" render={<Link href="/login" />}>
                        {t('login.signIn')}
                    </Button>
                </>
            ) : (
                <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
                    <Field
                        label={t('reset.newPassword')}
                        help={t('register.passwordHelp', { min: AUTH.PASSWORD_MIN_LENGTH })}
                        error={
                            tooShort
                                ? t('register.passwordTooShort', { min: AUTH.PASSWORD_MIN_LENGTH })
                                : null
                        }
                    >
                        <Input
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </Field>
                    <Field
                        label={t('register.repeatPassword')}
                        error={mismatch ? t('register.mismatch') : null}
                    >
                        <Input
                            type="password"
                            autoComplete="new-password"
                            value={repeat}
                            onChange={(event) => setRepeat(event.target.value)}
                        />
                    </Field>
                    {error !== null && <FormMessage tone="error">{t(errorKey(error))}</FormMessage>}
                    <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                        {t('reset.submit')}
                    </Button>
                    <BackToLogin label={t('common.backToLogin')} />
                </form>
            )}
        </div>
    );
}

function BackToLogin({ label }: { label: string }) {
    return (
        <p className="text-center text-sm">
            <Link
                href="/login"
                className="text-muted-foreground underline-offset-2 hover:underline"
            >
                {label}
            </Link>
        </p>
    );
}
