import type { Metadata } from 'next';

import { AvailabilityStep } from '@/components/onboarding/availability-step';

export const metadata: Metadata = { title: 'Your week' };

export default function WelcomeAvailabilityPage() {
    return <AvailabilityStep />;
}
