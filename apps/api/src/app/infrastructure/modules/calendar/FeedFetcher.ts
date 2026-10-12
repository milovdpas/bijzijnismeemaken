import { lookup } from 'node:dns';
import type { LookupAddress } from 'node:dns';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { LookupFunction } from 'node:net';
import { CALENDAR_FEED } from '@bzim/types';
import type { CalendarFeedProblem } from '@bzim/types';

/** A personal calendar is far smaller; anything bigger is not what we were promised. */
const MAX_BYTES = 5 * 1024 * 1024;
/** The whole fetch, redirects included per hop. */
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = 'BijZijnIsMeemaken-CalendarFeed/1.0';

/** Why a feed could not be fetched, as the screen names it. */
export class FeedError extends Error {
    constructor(
        readonly problem: CalendarFeedProblem,
        message: string,
    ) {
        super(message);
        this.name = 'FeedError';
    }
}

/**
 * Where a feed may never be fetched from: this machine, the private and
 * shared networks, link-local, documentation and multicast ranges, and the
 * IPv6 forms that lead back to IPv4 ones. The link is typed by a person,
 * and the server must not become their way into the network it runs on.
 */
const BLOCKED = new BlockList();
for (const [network, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
] as const) {
    BLOCKED.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
    ['::', 127],
    ['64:ff9b::', 96],
    ['2001:db8::', 32],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
] as const) {
    BLOCKED.addSubnet(network, prefix, 'ipv6');
}

/**
 * IPv4 written as IPv6. Its own list: a `BlockList` matches plain IPv4
 * addresses against this range too, which in `BLOCKED` would refuse them all.
 */
const MAPPED = new BlockList();
MAPPED.addSubnet('::ffff:0:0', 96, 'ipv6');

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 0) return false;
    if (family === 6 && MAPPED.check(address, 'ipv6')) return false;
    return !BLOCKED.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/**
 * A pasted link as the https URL to fetch, or null when it cannot be one.
 * `webcal://` is how Apple and Outlook hand their links out, and is https
 * underneath. No credentials in the link and no other port; an address
 * instead of a name must be a public one (a name is checked as it resolves).
 */
export function normalizeFeedUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.length > CALENDAR_FEED.URL_MAX_LENGTH) return null;
    let url: URL;
    try {
        url = new URL(trimmed.replace(/^webcals?:\/\//i, 'https://'));
    } catch {
        return null;
    }
    if (
        url.protocol !== 'https:' ||
        url.username !== '' ||
        url.password !== '' ||
        (url.port !== '' && url.port !== '443') ||
        url.hostname === ''
    ) {
        return null;
    }
    const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
    if (isIP(host) !== 0 && !isPublicAddress(host)) return null;
    url.hash = '';
    return url.toString();
}

/**
 * Resolves the way the system does, then refuses a name with any private
 * address behind it. The check sits in the lookup the connection itself
 * uses, so a name cannot answer one address to the check and another to
 * the connection.
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
        if (error !== null) {
            callback(error, '', 0);
            return;
        }
        const first = addresses[0];
        if (first === undefined || !addresses.every((entry) => isPublicAddress(entry.address))) {
            callback(new FeedError('UNREACHABLE', `${hostname} is not a public address`), '', 0);
            return;
        }
        if (options.all === true) callback(null, addresses);
        else callback(null, first.address, first.family);
    });
};

type Answer = { kind: 'redirect'; location: string } | { kind: 'body'; body: string };

/** One request: a redirect to follow, the body, or a `FeedError` saying why not. */
function request(url: string): Promise<Answer> {
    return new Promise((resolve, reject) => {
        const fail = (error: unknown) =>
            reject(
                error instanceof FeedError
                    ? error
                    : new FeedError(
                          'UNREACHABLE',
                          error instanceof Error ? error.message : String(error),
                      ),
            );
        const outgoing = https.get(
            url,
            {
                lookup: publicLookup,
                signal: AbortSignal.timeout(TIMEOUT_MS),
                headers: {
                    accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1',
                    'user-agent': USER_AGENT,
                },
            },
            (response) => {
                const status = response.statusCode ?? 0;
                const location = response.headers.location;
                if (status >= 300 && status < 400 && location !== undefined) {
                    response.resume();
                    resolve({ kind: 'redirect', location });
                    return;
                }
                if (status === 401 || status === 403 || status === 404 || status === 410) {
                    // Apple and Microsoft answer like this once a link is switched off.
                    response.resume();
                    reject(new FeedError('GONE', `The feed answered ${String(status)}`));
                    return;
                }
                if (status < 200 || status >= 300) {
                    response.resume();
                    reject(new FeedError('UNREACHABLE', `The feed answered ${String(status)}`));
                    return;
                }
                const chunks: Buffer[] = [];
                let size = 0;
                response.on('data', (chunk: Buffer) => {
                    size += chunk.length;
                    if (size > MAX_BYTES) {
                        outgoing.destroy(new FeedError('TOO_LARGE', 'The feed is too large'));
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on('end', () =>
                    resolve({ kind: 'body', body: Buffer.concat(chunks).toString('utf8') }),
                );
                response.on('error', fail);
            },
        );
        outgoing.on('error', fail);
    });
}

/**
 * Fetching a calendar link. The one seam to the outside world for feeds:
 * tests `vi.spyOn(FeedFetcher, 'fetch')` and nothing leaves the machine.
 */
export class FeedFetcher {
    /** The feed's text, following a few redirects that stay within the same rules. */
    static async fetch(url: string): Promise<string> {
        let current = url;
        for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
            const answer = await request(current);
            if (answer.kind === 'body') return answer.body;
            const next = normalizeFeedUrl(new URL(answer.location, current).toString());
            if (next === null) {
                throw new FeedError(
                    'UNREACHABLE',
                    'Redirected to a place a feed may not come from',
                );
            }
            current = next;
        }
        throw new FeedError('UNREACHABLE', 'Too many redirects');
    }
}
