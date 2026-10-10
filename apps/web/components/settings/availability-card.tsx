'use client';

import { CalendarOff } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** The door to the availability editor; the editor itself is a page, since it needs the width. */
export function AvailabilityCard() {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('availability.title')}</CardTitle>
                <CardDescription>{t('availability.cardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/settings/availability" />}
                >
                    <CalendarOff />
                    {t('availability.open')}
                </Button>
            </CardContent>
        </Card>
    );
}
