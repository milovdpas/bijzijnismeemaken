'use client';

import { CalendarCheck, CalendarDays, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useMarkSetup, useMe } from '@/hooks/queries/use-me';

/**
 * For whoever skipped a setup step: the two of them, each a link back to
 * its step, and a way to stop being asked. Gone once both are seen.
 */
export function SetupCard() {
    const { t } = useTranslation();
    const me = useMe();
    const mark = useMarkSetup();
    const setup = me.data?.setup;
    if (setup === undefined || (setup.calendarSeen && setup.availabilitySeen)) return null;

    const steps = [
        ...(setup.calendarSeen
            ? []
            : [{ href: '/welcome/calendar', icon: CalendarCheck, key: 'setupCard.calendar' }]),
        ...(setup.availabilitySeen
            ? []
            : [
                  {
                      href: '/welcome/availability',
                      icon: CalendarDays,
                      key: 'setupCard.availability',
                  },
              ]),
    ];
    const dismiss = () => {
        if (!setup.calendarSeen) mark.mutate('calendar');
        if (!setup.availabilitySeen) mark.mutate('availability');
    };

    return (
        <section className="mb-6 rounded-2xl border border-brand/60 bg-brand/10 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base">{t('setupCard.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('setupCard.description')}</p>
                </div>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('setupCard.dismiss')}
                    disabled={mark.isPending}
                    onClick={dismiss}
                >
                    <X />
                </Button>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {steps.map(({ href, icon: Icon, key }) => (
                    <li key={href}>
                        <Link
                            href={href}
                            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm font-semibold hover:border-ink/40"
                        >
                            <Icon className="size-4 text-muted-foreground" />
                            <span className="flex-1">{t(key)}</span>
                            <ChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
