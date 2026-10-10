'use client';

import { ERROR_CODES, PROFILE } from '@bzim/types';
import type { AvatarKey, MeResponse } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AvatarPicker } from '@/components/common/avatar-picker';
import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { useHandleAvailability } from '@/components/onboarding/use-handle-availability';
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
import { useUpdateMe } from '@/hooks/queries/use-me';
import { errorKey, isApiError } from '@/lib/api/errors';

interface FormState {
    handle: string;
    displayName: string;
    avatarKey: AvatarKey | null;
}

/** The same three fields as onboarding, editable later. Saves only what changed. */
export function ProfileCard({ me }: { me: MeResponse }) {
    const { t } = useTranslation();
    const update = useUpdateMe();
    const [form, setForm] = useState<FormState>({
        handle: me.handle ?? '',
        displayName: me.displayName ?? '',
        avatarKey: me.avatarKey,
    });
    const [saved, setSaved] = useState(false);
    const handleStatus = useHandleAvailability(form.handle, me.handle);

    const handle = form.handle.trim().toLowerCase();
    const displayName = form.displayName.trim();
    const dirty =
        handle !== me.handle || displayName !== me.displayName || form.avatarKey !== me.avatarKey;
    const canSave =
        dirty &&
        handleStatus === 'available' &&
        displayName !== '' &&
        form.avatarKey !== null &&
        !update.isPending;

    const save = () => {
        if (!canSave || form.avatarKey === null) return;
        setSaved(false);
        update.mutate(
            {
                ...(handle !== me.handle ? { handle } : {}),
                ...(displayName !== me.displayName ? { displayName } : {}),
                ...(form.avatarKey !== me.avatarKey ? { avatarKey: form.avatarKey } : {}),
            },
            { onSuccess: () => setSaved(true) },
        );
    };

    const handleError =
        handleStatus === 'invalid'
            ? t('profile.handleInvalid', {
                  min: PROFILE.HANDLE_MIN_LENGTH,
                  max: PROFILE.HANDLE_MAX_LENGTH,
              })
            : handleStatus === 'taken' || isApiError(update.error, ERROR_CODES.CONFLICT)
              ? t('profile.handleTaken')
              : null;

    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>{t('settings.profile')}</CardTitle>
                <CardDescription>{t('settings.profileDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <Field label={t('profile.avatar')}>
                    <AvatarPicker
                        value={form.avatarKey}
                        onChange={(avatarKey) => setForm({ ...form, avatarKey })}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('profile.displayName')}>
                        <Input
                            maxLength={PROFILE.DISPLAY_NAME_MAX_LENGTH}
                            value={form.displayName}
                            onChange={(event) =>
                                setForm({ ...form, displayName: event.target.value })
                            }
                        />
                    </Field>
                    <Field
                        label={t('profile.handle')}
                        help={t('profile.handleHelp')}
                        error={handleError}
                    >
                        <Input
                            autoCapitalize="none"
                            spellCheck={false}
                            maxLength={PROFILE.HANDLE_MAX_LENGTH}
                            value={form.handle}
                            onChange={(event) => setForm({ ...form, handle: event.target.value })}
                        />
                    </Field>
                </div>
                {update.isError && !isApiError(update.error, ERROR_CODES.CONFLICT) && (
                    <FormMessage tone="error">{t(errorKey(update.error))}</FormMessage>
                )}
                {saved && !dirty && <FormMessage tone="success">{t('common.saved')}</FormMessage>}
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={save} disabled={!canSave}>
                    {t('common.save')}
                </Button>
            </CardFooter>
        </Card>
    );
}
