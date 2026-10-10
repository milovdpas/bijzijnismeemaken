'use client';

import { AUTH, Locale } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { register, resendVerification } from '@/lib/api/auth';
import { errorKey } from '@/lib/api/errors';
import { usePreferencesStore } from '@/store/use-preferences-store';

interface FormState {
    email: string;
    password: string;
    repeat: string;
}

const blank: FormState = { email: '', password: '', repeat: '' };

/**
 * Creates the account, then turns into the "check your inbox" notice with a
 * resend button, because the next step happens in the person's mail client.
 */
export function RegisterForm() {
    const { t } = useTranslation();
    const locale = usePreferencesStore((s) => s.locale) ?? Locale.NL;
    const [form, setForm] = useState<FormState>(blank);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [registered, setRegistered] = useState<string | null>(null);
    const [resent, setResent] = useState(false);

    const tooShort = form.password !== '' && form.password.length < AUTH.PASSWORD_MIN_LENGTH;
    const mismatch = form.repeat !== '' && form.repeat !== form.password;
    const canSubmit =
        form.email.trim() !== '' &&
        form.password.length >= AUTH.PASSWORD_MIN_LENGTH &&
        form.repeat === form.password &&
        !busy;

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        try {
            await register(form.email.trim(), form.password, locale);
            setRegistered(form.email.trim());
        } catch (caught) {
            setError(caught);
        } finally {
            setBusy(false);
        }
    };

    if (registered !== null) {
        return (
            <div className="space-y-4">
                <FormMessage tone="success">
                    {t('register.checkInbox', { email: registered })}
                </FormMessage>
                <Button
                    variant="outline"
                    className="w-full"
                    disabled={resent}
                    onClick={() => void resendVerification(registered).then(() => setResent(true))}
                >
                    {resent ? t('login.resent') : t('login.resendVerification')}
                </Button>
            </div>
        );
    }

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
            <Field
                label={t('login.password')}
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
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
            </Field>
            <Field
                label={t('register.repeatPassword')}
                error={mismatch ? t('register.mismatch') : null}
            >
                <Input
                    type="password"
                    autoComplete="new-password"
                    value={form.repeat}
                    onChange={(event) => setForm({ ...form, repeat: event.target.value })}
                />
            </Field>

            {error !== null && <FormMessage tone="error">{t(errorKey(error))}</FormMessage>}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                {t('login.createAccount')}
            </Button>
        </form>
    );
}
