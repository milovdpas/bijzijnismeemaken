import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CalendarSettingsView } from '@/components/calendar/calendar-settings-view';

export const metadata: Metadata = { title: 'Calendar' };

/** The view reads the connect outcome from the query, which needs a Suspense boundary. */
export default function CalendarSettingsPage() {
    return (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
            <CalendarSettingsView />
        </Suspense>
    );
}
