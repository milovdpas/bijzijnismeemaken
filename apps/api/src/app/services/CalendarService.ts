import { DateTime } from 'luxon';
import { CalendarConnectionStatus, CalendarProviderKey } from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import CalendarConnection from '../models/CalendarConnection.entity';
import CalendarEvent from '../models/CalendarEvent.entity';
import CalendarSource from '../models/CalendarSource.entity';
import OAuthState, { OAuthPurpose } from '../models/OAuthState.entity';
import type User from '../models/User.entity';
import { ProviderError } from '../modules/calendar/CalendarProvider';
import type { CalendarProvider, CalendarScope } from '../modules/calendar/CalendarProvider';
import { CalendarProviderFactory } from '../modules/calendar/CalendarProviderFactory';
import Crypt from '../utils/Crypt';
import { generateToken } from '../utils/Token';

/** How long the Google round trip may take before the state is stale. */
const OAUTH_STATE_MINUTES = 10;
/** An access token this close to expiry is refreshed before use. */
const REFRESH_MARGIN_SECONDS = 60;
const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export type ConnectResult =
    | { ok: true; connection: CalendarConnection }
    | { ok: false; problem: 'STATE_INVALID' | 'PROVIDER_FAILED' };

/**
 * A person's calendar connection (docs/02 §2.6): connecting through the
 * provider's OAuth, the calendars it exposes, disconnecting, and the access
 * token the sync and auto-add use. One connection per person in the MVP; a
 * new one replaces the old.
 */
export class CalendarService {
    static find(user: User): Promise<CalendarConnection | null> {
        return CalendarConnection.findOne({
            where: { userId: user.id },
            relations: { sources: true },
            order: { sources: { isPrimary: 'DESC', name: 'ASC' } },
        });
    }

    static provider(): CalendarProvider {
        return CalendarProviderFactory.for(CalendarProviderKey.GOOGLE);
    }

    /** The URL to send the browser to. The state row remembers who asked, so the callback can check. */
    static async startConnect(user: User, scope: CalendarScope): Promise<string> {
        const state = generateToken();
        await OAuthState.create({
            state,
            purpose:
                scope === 'readwrite' ? OAuthPurpose.CALENDAR_WRITE : OAuthPurpose.CALENDAR_READ,
            userId: user.id,
            returnTo: null,
            expiresAt: DateTime.utc().plus({ minutes: OAUTH_STATE_MINUTES }).toJSDate(),
        }).save();
        return CalendarService.provider().connectUrl(state, scope);
    }

    /**
     * The callback. The state must be this person's (a crafted link cannot
     * attach a stranger's calendar) and is consumed either way. Then the
     * tokens are stored, the old connection (if any) is replaced, and the
     * calendars are listed with the primary one enabled.
     */
    static async completeConnect(user: User, state: string, code: string): Promise<ConnectResult> {
        const row = await OAuthState.findOneBy({ state });
        if (row === null) {
            return { ok: false, problem: 'STATE_INVALID' };
        }
        // Consumed first, whoever presented it: a state seen once is never valid again.
        await row.remove();
        if (
            row.userId !== user.id ||
            (row.purpose !== OAuthPurpose.CALENDAR_READ &&
                row.purpose !== OAuthPurpose.CALENDAR_WRITE) ||
            row.isExpired(DateTime.utc())
        ) {
            return { ok: false, problem: 'STATE_INVALID' };
        }

        const provider = CalendarService.provider();
        let tokens;
        let calendars;
        try {
            tokens = await provider.exchangeCode(code);
            calendars = await provider.listCalendars(tokens.accessToken);
        } catch (error) {
            console.error('Calendar connect failed:', error);
            return { ok: false, problem: 'PROVIDER_FAILED' };
        }

        const previous = await CalendarService.find(user);
        if (previous !== null) {
            await CalendarService.revokeQuietly(provider, previous);
        }
        const connection = await AppDataSource.transaction(async (manager) => {
            if (previous !== null) await manager.remove(previous);
            const created = await manager.save(
                manager.create(CalendarConnection, {
                    userId: user.id,
                    provider: provider.key,
                    accountEmail: tokens.accountEmail,
                    accountEmailHash: Crypt.searchHash(tokens.accountEmail),
                    refreshToken: tokens.refreshToken,
                    accessToken: tokens.accessToken,
                    accessTokenExpiresAt: tokens.expiresAt,
                    scopes: tokens.grantedScopes.join(' '),
                    hasWriteScope: tokens.grantedScopes.includes(WRITE_SCOPE),
                    status: CalendarConnectionStatus.ACTIVE,
                    lastSyncedAt: null,
                    lastError: null,
                }),
            );
            await manager.save(
                calendars.map((calendar) =>
                    manager.create(CalendarSource, {
                        connectionId: created.id,
                        providerCalendarId: calendar.id,
                        name: calendar.name,
                        isPrimary: calendar.primary,
                        enabled: calendar.primary,
                        timeZone: calendar.timeZone,
                    }),
                ),
            );
            return created;
        });
        return { ok: true, connection: await CalendarService.reload(connection.id) };
    }

    /** Gone at the provider too, so a reconnect starts with a fresh grant; the events go with the rows. */
    static async disconnect(connection: CalendarConnection): Promise<void> {
        await CalendarService.revokeQuietly(CalendarService.provider(), connection);
        await connection.remove();
    }

    /** A source switched off takes its events with it; switched on, the next sync fills it. */
    static async setSourceEnabled(
        connection: CalendarConnection,
        sourceId: string,
        enabled: boolean,
    ): Promise<CalendarSource | null> {
        const source = await CalendarSource.findOneBy({
            id: sourceId,
            connectionId: connection.id,
        });
        if (source === null) return null;
        source.enabled = enabled;
        await source.save();
        if (!enabled) {
            await CalendarEvent.delete({ sourceId: source.id });
        }
        return source;
    }

    /**
     * A usable access token, refreshed when missing or about to expire. A
     * dead grant marks the connection as needing reauthorisation and throws,
     * so the caller stops and the screen can say so.
     */
    static async accessToken(connection: CalendarConnection): Promise<string> {
        const expiresAt = connection.accessTokenExpiresAt;
        const fresh =
            connection.accessToken !== null &&
            expiresAt !== null &&
            DateTime.fromJSDate(expiresAt) >
                DateTime.utc().plus({ seconds: REFRESH_MARGIN_SECONDS });
        if (fresh && connection.accessToken !== null) {
            return connection.accessToken;
        }
        try {
            const refreshed = await CalendarService.provider().refreshAccessToken(
                connection.refreshToken,
            );
            connection.accessToken = refreshed.accessToken;
            connection.accessTokenExpiresAt = refreshed.expiresAt;
            await connection.save();
            return refreshed.accessToken;
        } catch (error) {
            if (error instanceof ProviderError && error.reauthRequired) {
                connection.status = CalendarConnectionStatus.REAUTH_REQUIRED;
                connection.lastError = error.message;
                await connection.save();
            }
            throw error;
        }
    }

    static reload(id: string): Promise<CalendarConnection> {
        return CalendarConnection.findOneOrFail({
            where: { id },
            relations: { sources: true },
            order: { sources: { isPrimary: 'DESC', name: 'ASC' } },
        });
    }

    /** Revocation is a courtesy to the next connect; a provider that refuses it must not stop a disconnect. */
    private static async revokeQuietly(
        provider: CalendarProvider,
        connection: CalendarConnection,
    ): Promise<void> {
        try {
            await provider.revoke(connection.refreshToken);
        } catch (error) {
            console.warn('Calendar token revocation failed:', error);
        }
    }
}
