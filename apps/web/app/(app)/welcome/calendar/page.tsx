import type { Metadata } from 'next';

import { CalendarStep } from '@/components/onboarding/calendar-step';

export const metadata: Metadata = { title: 'Your calendar' };

export default function WelcomeCalendarPage() {
    return <CalendarStep />;
}
