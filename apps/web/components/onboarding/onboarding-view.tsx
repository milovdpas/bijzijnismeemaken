'use client';

import { ERROR_CODES, Locale, PROFILE } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AvatarPicker } from '@/components/common/avatar-picker';
import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { useHandleAvailability } from '@/components/onboarding/use-handle-availability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMe, useUpdateMe } from '@/hooks/queries/use-me';
import { errorKey, isApiError } from '@/lib/api/errors';
import { LOCALE_LABELS } from '@/lib/i18n';
import { suggestHandle } from '@/lib/suggest-handle';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/use-preferences-store';

interface FormState {
    handle: string;
    displayName: string;
    avatarKey: AvatarKey | null;
    locale: Locale;
}

/**
 * The three things a group needs to know about a person, plus the language.
 * One screen, one save: `AuthGate` keeps everyone here until it is done.
 */
export function OnboardingView() {
    const { t } = useTranslation();
    const router = useRouter();
    const me = useMe();
    const update = useUpdateMe();
    const deviceLocale = usePreferencesStore((s) => s.locale);
    const setDeviceLocale = usePreferencesStore((s) => s.setLocale);
    const [form, setForm] = useState<FormState>(() => ({
        handle: me.data?.handle ?? suggestHandle(me.data?.displayName ?? ''),
        displayName: me.data?.displayName ?? '',
        avatarKey: me.data?.avatarKey ?? null,
        locale: deviceLocale ?? me.data?.locale ?? Locale.NL,
    }));
    // The handle follows the display name until the person edits it by hand;
    // after that their choice stands, whatever they do to the name.
    const [handleEdited, setHandleEdited] = useState(me.data?.handle !== null);
    const handleStatus = useHandleAvailability(form.handle, me.data?.handle ?? null);

    // Applied at once, like the settings card: the page switches language while
    // the person is still on it, and the server copy follows so AuthGate's sync
    // (which trusts the profile) does not flip it back.
    const chooseLocale = (locale: Locale) => {
        setForm({ ...form, locale });
        setDeviceLocale(locale);
        update.mutate({ locale });
    };

    const changeDisplayName = (displayName: string) => {
        setForm({
            ...form,
            displayName,
            handle: handleEdited ? form.handle : suggestHandle(displayName),
        });
    };

    const canSave =
        handleStatus === 'available' &&
        form.displayName.trim() !== '' &&
        form.avatarKey !== null &&
        !update.isPending;

    const save = () => {
        if (!canSave || form.avatarKey === null) return;
        update.mutate(
            {
                handle: form.handle.trim().toLowerCase(),
                displayName: form.displayName.trim(),
                avatarKey: form.avatarKey,
                locale: form.locale,
            },
            { onSuccess: () => router.replace('/welcome/calendar') },
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
        <div className="mx-auto max-w-xl">
            <header className="mb-6">
                <h1 className="text-2xl md:text-3xl">{t('onboarding.title')}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.subtitle')}</p>
            </header>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    save();
                }}
                className="space-y-6"
                noValidate
            >
                <Field label={t('profile.avatar')}>
                    <AvatarPicker
                        value={form.avatarKey}
                        onChange={(avatarKey) => setForm({ ...form, avatarKey })}
                    />
                </Field>

                <Field label={t('profile.displayName')} help={t('profile.displayNameHelp')}>
                    <Input
                        autoComplete="nickname"
                        maxLength={PROFILE.DISPLAY_NAME_MAX_LENGTH}
                        value={form.displayName}
                        onChange={(event) => changeDisplayName(event.target.value)}
                    />
                </Field>

                <Field
                    label={t('profile.handle')}
                    help={
                        handleStatus === 'available' && form.handle !== ''
                            ? t('profile.handleAvailable')
                            : t('profile.handleHelp')
                    }
                    error={handleError}
                >
                    <Input
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={PROFILE.HANDLE_MAX_LENGTH}
                        value={form.handle}
                        onChange={(event) => {
                            setHandleEdited(true);
                            setForm({ ...form, handle: event.target.value });
                        }}
                    />
                </Field>

                <Field label={t('settings.language')}>
                    <div className="flex gap-2">
                        {Object.values(Locale).map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={form.locale === value}
                                onClick={() => chooseLocale(value)}
                                className={cn(
                                    'flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                                    form.locale === value
                                        ? 'border-brand bg-brand text-brand-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                {LOCALE_LABELS[value]}
                            </button>
                        ))}
                    </div>
                </Field>

                {update.isError && !isApiError(update.error, ERROR_CODES.CONFLICT) && (
                    <FormMessage tone="error">{t(errorKey(update.error))}</FormMessage>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={!canSave}>
                    {t('onboarding.done')}
                </Button>
            </form>
        </div>
    );
}
