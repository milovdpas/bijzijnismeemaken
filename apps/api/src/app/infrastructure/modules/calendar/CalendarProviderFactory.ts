import { CalendarProviderKey } from '@bzim/types';

import type { CalendarProvider } from './CalendarProvider';
import { GoogleCalendarProvider } from './GoogleCalendarProvider';

const google = new GoogleCalendarProvider();

/**
 * Hands out the provider for a key. The one seam between the services and
 * the outside world: tests `vi.spyOn(CalendarProviderFactory, 'for')` and
 * return a `FixtureCalendarProvider`, and nothing reaches Google.
 */
export class CalendarProviderFactory {
    static for(key: CalendarProviderKey): CalendarProvider {
        switch (key) {
            case CalendarProviderKey.GOOGLE:
                return google;
        }
    }
}
