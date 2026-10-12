import { DateTime } from 'luxon';
import { In, Not } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { CALENDAR_FEED, CalendarConnectionStatus } from '@bzim/types';
import type { CalendarFeedProblem } from '@bzim/types';

import { AppDataSource } from '../../../database/typeorm-db';
import CalendarEvent from '../models/CalendarEvent.entity';
import CalendarFeed from '../models/CalendarFeed.entity';
import type User from '../models/User.entity';
import type { ProviderEvent } from '../../infrastructure/modules/calendar/CalendarProvider';
import {
    FeedError,
    FeedFetcher,
    normalizeFeedUrl,
} from '../../infrastructure/modules/calendar/FeedFetcher';
import { parseIcsFeed } from '../../infrastructure/modules/calendar/IcsFeed';
import type { ParsedFeed } from '../../infrastructure/modules/calendar/IcsFeed';
import Crypt from '../../infrastructure/utils/Crypt';
import { CalendarSyncService } from './CalendarSyncService';

export type AddFeedResult =
    | { ok: true; feed: CalendarFeed }
    | { ok: false; problem: CalendarFeedProblem | 'ALREADY_ADDED' | 'TOO_MANY' };

type ReadResult = { ok: true; parsed: ParsedFeed } | { ok: false; problem: CalendarFeedProblem };

/**
 * Calendars read through a link (docs/02 §2.6): adding one, reading it
 * again, and taking it away. A link is read in full each time, over the
 * same window as Google's calendars, and its events replace what it held
 * in one transaction. A failure is written on the feed, never thrown: a
 * link that was switched off as `reauth_required`, so it is not read
 * every night in vain, anything else as `error` to be tried again.
 */
export class CalendarFeedService {
    static list(user: User): Promise<CalendarFeed[]> {
        return CalendarFeed.find({ where: { userId: user.id }, order: { createdAt: 'ASC' } });
    }

    static findOwn(user: User, feedId: string): Promise<CalendarFeed | null> {
        return CalendarFeed.findOneBy({ id: feedId, userId: user.id });
    }

    /**
     * Adds a link and reads it straight away, so the calendar counts on the
     * next screen. A link that cannot be read is not kept: the person sees
     * why while the link is still in front of them.
     */
    static async add(user: User, rawUrl: string, name: string | undefined): Promise<AddFeedResult> {
        const url = normalizeFeedUrl(rawUrl);
        if (url === null) {
            return { ok: false, problem: 'INVALID_URL' };
        }
        const urlHash = Crypt.hash(url);
        if (await CalendarFeed.existsBy({ userId: user.id, urlHash })) {
            return { ok: false, problem: 'ALREADY_ADDED' };
        }
        if ((await CalendarFeed.countBy({ userId: user.id })) >= CALENDAR_FEED.MAX_PER_USER) {
            return { ok: false, problem: 'TOO_MANY' };
        }
        const read = await CalendarFeedService.read(url);
        if (!read.ok) {
            return read;
        }
        const host = new URL(url).hostname;
        const feed = await AppDataSource.transaction(async (manager) => {
            const created = await manager.save(
                manager.create(CalendarFeed, {
                    userId: user.id,
                    name: (name?.trim() || read.parsed.name || host).slice(
                        0,
                        CALENDAR_FEED.NAME_MAX_LENGTH,
                    ),
                    url,
                    urlHash,
                    host,
                    status: CalendarConnectionStatus.ACTIVE,
                    lastSyncedAt: DateTime.utc().toJSDate(),
                    lastError: null,
                }),
            );
            await CalendarFeedService.store(manager, created, read.parsed.events);
            return created;
        });
        return { ok: true, feed };
    }

    /** Reads the link again. True when it could. */
    static async sync(feed: CalendarFeed): Promise<boolean> {
        const read = await CalendarFeedService.read(feed.url);
        if (!read.ok) {
            feed.status =
                read.problem === 'GONE'
                    ? CalendarConnectionStatus.REAUTH_REQUIRED
                    : CalendarConnectionStatus.ERROR;
            feed.lastError = read.problem;
            await feed.save();
            return false;
        }
        await AppDataSource.transaction(async (manager) => {
            await CalendarFeedService.store(manager, feed, read.parsed.events);
            feed.status = CalendarConnectionStatus.ACTIVE;
            feed.lastSyncedAt = DateTime.utc().toJSDate();
            feed.lastError = null;
            await manager.save(feed);
        });
        return true;
    }

    /** "Sync now": every link of this person, one after the other. */
    static async syncAllFor(user: User): Promise<CalendarFeed[]> {
        const feeds = await CalendarFeedService.list(user);
        for (const feed of feeds) {
            await CalendarFeedService.sync(feed);
        }
        return feeds;
    }

    /** The nightly run: every link that has not been switched off at its calendar. */
    static async syncAll(): Promise<Record<string, number>> {
        const feeds = await CalendarFeed.find({
            where: { status: Not(In([CalendarConnectionStatus.REAUTH_REQUIRED])) },
        });
        const stats = { feeds: feeds.length, feedsSynced: 0, feedsFailed: 0 };
        for (const feed of feeds) {
            if (await CalendarFeedService.sync(feed)) stats.feedsSynced += 1;
            else stats.feedsFailed += 1;
        }
        return stats;
    }

    /** Its events go with it, through the database. */
    static async remove(feed: CalendarFeed): Promise<void> {
        await feed.remove();
    }

    /** Fetches and reads a link over the sync window. */
    private static async read(url: string): Promise<ReadResult> {
        const { from, to } = CalendarSyncService.window();
        let text: string;
        try {
            text = await FeedFetcher.fetch(url);
        } catch (error) {
            return {
                ok: false,
                problem: error instanceof FeedError ? error.problem : 'UNREACHABLE',
            };
        }
        try {
            return { ok: true, parsed: parseIcsFeed(text, from, to) };
        } catch {
            return { ok: false, problem: 'NOT_A_CALENDAR' };
        }
    }

    /** The feed's events become exactly these. */
    private static async store(
        manager: EntityManager,
        feed: CalendarFeed,
        events: ProviderEvent[],
    ): Promise<void> {
        const syncedAt = DateTime.utc().toJSDate();
        await manager.delete(CalendarEvent, { feedId: feed.id });
        await manager.save(
            events.map((event) =>
                manager.create(CalendarEvent, {
                    userId: feed.userId,
                    sourceId: null,
                    feedId: feed.id,
                    providerEventId: event.id,
                    recurringEventId: event.recurringEventId,
                    title: event.title.slice(0, 255),
                    startAt: event.startAt,
                    endAt: event.endAt,
                    allDay: event.allDay,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    transparent: event.transparent,
                    eventType: event.eventType,
                    syncedAt,
                }),
            ),
            { chunk: 500 },
        );
    }
}
