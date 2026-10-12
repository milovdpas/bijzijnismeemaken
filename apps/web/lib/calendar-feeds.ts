export type FeedOrigin = 'apple' | 'outlook' | 'google' | 'other';

/** Whether `host` is `domain` itself or a name under it. */
function under(host: string, domain: string): boolean {
    return host === domain || host.endsWith(`.${domain}`);
}

/** Where a calendar link comes from, by its host, for a label the person recognises. */
export function feedOrigin(host: string): FeedOrigin {
    const name = host.toLowerCase();
    if (under(name, 'icloud.com')) return 'apple';
    if (under(name, 'outlook.live.com') || under(name, 'outlook.office365.com')) return 'outlook';
    if (under(name, 'outlook.office.com')) return 'outlook';
    if (name === 'calendar.google.com') return 'google';
    return 'other';
}
