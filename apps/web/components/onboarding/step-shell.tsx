'use client';

import { useTranslation } from 'react-i18next';

/** The frame of an optional setup step: where you are, what this one is for, and the step itself. */
export function StepShell({
    step,
    of,
    titleKey,
    subtitleKey,
    children,
}: {
    step: number;
    of: number;
    titleKey: string;
    subtitleKey: string;
    children: React.ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div className="mx-auto max-w-xl">
            <header className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground">
                    {t('welcome.step', { step, of })}
                </p>
                <h1 className="text-2xl md:text-3xl">{t(titleKey)}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t(subtitleKey)}</p>
            </header>
            {children}
        </div>
    );
}
