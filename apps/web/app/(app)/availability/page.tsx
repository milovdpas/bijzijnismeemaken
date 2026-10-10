import type { Metadata } from 'next';

import { MyAvailabilityView } from '@/components/availability/my-availability-view';

export const metadata: Metadata = { title: 'Availability' };

export default function AvailabilityPage() {
    return <MyAvailabilityView />;
}
