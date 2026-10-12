import { describe, expect, it } from 'vitest';

import { feedOrigin } from './calendar-feeds';

describe('feedOrigin', () => {
    it('knows Apple, Outlook and Google links by their host', () => {
        expect(feedOrigin('p52-caldav.icloud.com')).toBe('apple');
        expect(feedOrigin('outlook.live.com')).toBe('outlook');
        expect(feedOrigin('Outlook.Office365.com')).toBe('outlook');
        expect(feedOrigin('outlook.office.com')).toBe('outlook');
        expect(feedOrigin('calendar.google.com')).toBe('google');
    });

    it('calls anything else just a calendar link, also look-alikes', () => {
        expect(feedOrigin('calendar.example.org')).toBe('other');
        expect(feedOrigin('icloud.com.example.org')).toBe('other');
        expect(feedOrigin('notoutlook.live.com.evil.example')).toBe('other');
    });
});
