'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgotPassword } from '@/lib/api/auth';
import { errorKey } from '@/lib/api/errors';

/** Always ends in the same notice: the API never says whether the address exists. */
export function ForgotPasswordView() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [sent, setSent] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (email.trim() === '' || busy) return;
        setBusy(true);
        setError(null);
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (caught) {
            setError(caught);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg">{t('forgot.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('forgot.intro')}</p>
            </div>

            {sent ? (
                <FormMessage tone="success">{t('forgot.sent')}</FormMessage>
            ) : (
                <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
                    <Field label={t('login.email')}>
                        <Input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </Field>
                    {error !== null && <FormMessage tone="error">{t(errorKey(error))}</FormMessage>}
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={email.trim() === '' || busy}
                    >
                        {t('forgot.submit')}
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
