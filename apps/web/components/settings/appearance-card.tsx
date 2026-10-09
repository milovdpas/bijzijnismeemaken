'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMounted } from '@/hooks/use-mounted';
import { PALETTES } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/use-preferences-store';

const SCHEMES = [
    { value: 'light', labelKey: 'settings.themeLight', icon: Sun },
    { value: 'dark', labelKey: 'settings.themeDark', icon: Moon },
    { value: 'system', labelKey: 'settings.themeSystem', icon: Monitor },
] as const;

const PILL =
    'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors';
const PILL_SELECTED = 'border-brand bg-brand text-brand-foreground';
const PILL_IDLE = 'text-muted-foreground hover:bg-accent hover:text-foreground';

/**
 * Colour scheme and palette, as pill radios: the choices are few and are
 * better seen at once than hidden in a select. The palette row only appears
 * once there is a second palette to choose from.
 */
export function AppearanceCard() {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();
    const mounted = useMounted();
    const palette = usePreferencesStore((s) => s.palette);
    const setPalette = usePreferencesStore((s) => s.setPalette);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.appearance')}</CardTitle>
                <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div
                    className="flex gap-2"
                    role="radiogroup"
                    aria-label={t('settings.colorScheme')}
                >
                    {SCHEMES.map(({ value, labelKey, icon: Icon }) => {
                        const selected = mounted && theme === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setTheme(value)}
                                className={cn(
                                    PILL,
                                    'flex-col',
                                    selected ? PILL_SELECTED : PILL_IDLE,
                                )}
                            >
                                <Icon className="size-5" />
                                {t(labelKey)}
                            </button>
                        );
                    })}
                </div>

                {PALETTES.length > 1 && (
                    <div
                        className="flex gap-2"
                        role="radiogroup"
                        aria-label={t('settings.palette')}
                    >
                        {PALETTES.map(({ id, labelKey, swatch }) => {
                            const selected = palette === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setPalette(id)}
                                    className={cn(PILL, selected ? PILL_SELECTED : PILL_IDLE)}
                                >
                                    <span className="flex -space-x-1" aria-hidden>
                                        <span
                                            className="size-4 rounded-full border border-background"
                                            style={{ backgroundColor: swatch[0] }}
                                        />
                                        <span
                                            className="size-4 rounded-full border border-background"
                                            style={{ backgroundColor: swatch[1] }}
                                        />
                                    </span>
                                    {t(labelKey)}
                                </button>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
