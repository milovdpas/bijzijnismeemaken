'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AUTH } from '@bzim/types';
import type { MeResponse } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorKey } from '@/lib/api/errors';
import { changePassword } from '@/lib/api/users';
import { queryKeys } from '@/lib/query-keys';

interface FormState {
    current: string;
    next: string;
    repeat: string;
}

const blank: FormState = { current: '', next: '', repeat: '' };

/**
 * Set a password (Google-only account) or change it. The current password
 * field only appears when there is one to confirm.
 */
export function PasswordCard({ me }: { me: MeResponse }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FormState>(blank);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [saved, setSaved] = useState(false);

    const tooShort = form.next !== '' && form.next.length < AUTH.PASSWORD_MIN_LENGTH;
    const mismatch = form.repeat !== '' && form.repeat !== form.next;
    const canSave =
        (!me.hasPassword || form.current !== '') &&
        form.next.length >= AUTH.PASSWORD_MIN_LENGTH &&
        form.repeat === form.next &&
        !busy;

    const save = async () => {
        if (!canSave) return;
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
            await changePassword({
                currentPassword: me.hasPassword ? form.current : undefined,
                newPassword: form.next,
            });
            await queryClient.invalidateQueries({ queryKey: queryKeys.me });
            setForm(blank);
            setSaved(true);
        } catch (caught) {
            setError(caught);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {t(me.hasPassword ? 'settings.changePassword' : 'settings.setPassword')}
                </CardTitle>
                <CardDescription>
                    {t(
                        me.hasPassword
                            ? 'settings.changePasswordDescription'
                            : 'settings.setPasswordDescription',
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {me.hasPassword && (
                    <Field label={t('settings.currentPassword')}>
                        <Input
                            type="password"
                            autoComplete="current-password"
                            value={form.current}
                            onChange={(event) => setForm({ ...form, current: event.target.value })}
                        />
                    </Field>
                )}
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
                        value={form.next}
                        onChange={(event) => setForm({ ...form, next: event.target.value })}
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
                {saved && <FormMessage tone="success">{t('settings.passwordSaved')}</FormMessage>}
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={() => void save()} disabled={!canSave}>
                    {t('common.save')}
                </Button>
            </CardFooter>
        </Card>
    );
}
