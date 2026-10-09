'use client';

import { Locale } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LOCALE_LABELS } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/use-preferences-store';

/**
 * Writes to the preferences store; `I18nProvider` applies it. Once a profile
 * exists (task 10) this also patches the server copy so emails follow.
 */
export function LanguageCard() {
    const { t } = useTranslation();
    const locale = usePreferencesStore((s) => s.locale);
    const setLocale = usePreferencesStore((s) => s.setLocale);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.language')}</CardTitle>
                <CardDescription>{t('settings.languageDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2" role="radiogroup" aria-label={t('settings.language')}>
                    {Object.values(Locale).map((value) => {
                        const selected = locale === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setLocale(value)}
                                className={cn(
                                    'flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                                    selected
                                        ? 'border-brand bg-brand text-brand-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                {LOCALE_LABELS[value]}
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
