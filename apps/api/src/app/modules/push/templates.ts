import { Locale } from '@bzim/types';

import type { PushMessage } from './PushSender';

/** The words of every push, per language. Short: a notification is a line, not a letter. */
interface PushDict {
    invite: (values: { inviter: string; group: string }) => Pick<PushMessage, 'title' | 'body'>;
    created: (values: {
        creator: string;
        group: string;
        title: string;
    }) => Pick<PushMessage, 'title' | 'body'>;
    planned: (values: { title: string; when: string }) => Pick<PushMessage, 'title' | 'body'>;
    rescheduled: (values: { title: string; when: string }) => Pick<PushMessage, 'title' | 'body'>;
    cancelled: (values: { title: string; when: string }) => Pick<PushMessage, 'title' | 'body'>;
    reminder: (values: { title: string; when: string }) => Pick<PushMessage, 'title' | 'body'>;
}

const DICTS: Record<Locale, PushDict> = {
    [Locale.NL]: {
        invite: ({ inviter, group }) => ({
            title: `Uitnodiging voor ${group}`,
            body: `${inviter} nodigt je uit.`,
        }),
        created: ({ creator, group, title }) => ({
            title: `Nieuw idee in ${group}`,
            body: `${creator} heeft "${title}" toegevoegd.`,
        }),
        planned: ({ title, when }) => ({
            title: `${title} staat gepland`,
            body: when,
        }),
        rescheduled: ({ title, when }) => ({
            title: `${title} is verzet`,
            body: `Nu: ${when}`,
        }),
        cancelled: ({ title, when }) => ({
            title: `${title} gaat niet door`,
            body: when,
        }),
        reminder: ({ title, when }) => ({
            title: `Morgen: ${title}`,
            body: when,
        }),
    },
    [Locale.EN]: {
        invite: ({ inviter, group }) => ({
            title: `Invitation to ${group}`,
            body: `${inviter} invited you.`,
        }),
        created: ({ creator, group, title }) => ({
            title: `New idea in ${group}`,
            body: `${creator} added "${title}".`,
        }),
        planned: ({ title, when }) => ({
            title: `${title} is planned`,
            body: when,
        }),
        rescheduled: ({ title, when }) => ({
            title: `${title} moved`,
            body: `Now: ${when}`,
        }),
        cancelled: ({ title, when }) => ({
            title: `${title} is off`,
            body: when,
        }),
        reminder: ({ title, when }) => ({
            title: `Tomorrow: ${title}`,
            body: when,
        }),
    },
};

/** A tap on a push lands on a path of the app; the message carries only the path. */
function path(link: string): string {
    try {
        const url = new URL(link);
        return `${url.pathname}${url.search}`;
    } catch {
        return link;
    }
}

export function pushGroupInvite(
    locale: Locale,
    values: { inviter: string; group: string; link: string },
): PushMessage {
    return { ...DICTS[locale].invite(values), url: path(values.link), tag: 'invite' };
}

export function pushActivityCreated(
    locale: Locale,
    values: { creator: string; group: string; title: string; link: string; activityId: string },
): PushMessage {
    return {
        ...DICTS[locale].created(values),
        url: path(values.link),
        tag: `activity-${values.activityId}`,
    };
}

export function pushOccurrence(
    kind: 'planned' | 'rescheduled' | 'cancelled' | 'reminder',
    locale: Locale,
    values: { title: string; when: string; link: string; occurrenceId: string },
): PushMessage {
    return {
        ...DICTS[locale][kind](values),
        url: path(values.link),
        tag: `occurrence-${values.occurrenceId}`,
    };
}
