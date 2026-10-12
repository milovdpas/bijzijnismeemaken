'use client';

import { useTranslation } from 'react-i18next';

import {
    Accordion,
    AccordionItem,
    AccordionPanel,
    AccordionTrigger,
} from '@/components/ui/accordion';

/** Where Apple and Outlook hand out a calendar's link, step by step. */
export function FeedHelp() {
    const { t } = useTranslation();
    const steps = {
        apple: ['calendarFeeds.appleIphone', 'calendarFeeds.appleMac', 'calendarFeeds.appleWeb'],
        outlook: [
            'calendarFeeds.outlookWeb',
            'calendarFeeds.outlookBusy',
            'calendarFeeds.outlookWork',
        ],
    } as const;

    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">
                {t('calendarFeeds.howTitle')}
            </p>
            <Accordion>
                {(['apple', 'outlook'] as const).map((origin) => (
                    <AccordionItem key={origin} value={origin}>
                        <AccordionTrigger>
                            {t(
                                origin === 'apple'
                                    ? 'calendarFeeds.howApple'
                                    : 'calendarFeeds.howOutlook',
                            )}
                        </AccordionTrigger>
                        <AccordionPanel>
                            <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                                {steps[origin].map((key) => (
                                    <li key={key}>{t(key)}</li>
                                ))}
                            </ul>
                        </AccordionPanel>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
