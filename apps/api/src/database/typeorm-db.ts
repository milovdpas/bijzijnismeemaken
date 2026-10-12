import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { databaseConfig } from '../config/database';
import Activity from '../app/domain/models/Activity.entity';
import ActivityInterest from '../app/domain/models/ActivityInterest.entity';
import ActivityOccurrence from '../app/domain/models/ActivityOccurrence.entity';
import EmailToken from '../app/domain/models/EmailToken.entity';
import Group from '../app/domain/models/Group.entity';
import GroupInvite from '../app/domain/models/GroupInvite.entity';
import NotificationSetting from '../app/domain/models/NotificationSetting.entity';
import GroupMember from '../app/domain/models/GroupMember.entity';
import GroupWidget from '../app/domain/models/GroupWidget.entity';
import Leaderboard from '../app/domain/models/Leaderboard.entity';
import LeaderboardEditor from '../app/domain/models/LeaderboardEditor.entity';
import LeaderboardMember from '../app/domain/models/LeaderboardMember.entity';
import LeaderboardScoreHistory from '../app/domain/models/LeaderboardScoreHistory.entity';
import LeaderboardScoreMonthly from '../app/domain/models/LeaderboardScoreMonthly.entity';
import LeaderboardScoreTotal from '../app/domain/models/LeaderboardScoreTotal.entity';
import LeaderboardScoreYearly from '../app/domain/models/LeaderboardScoreYearly.entity';
import CalendarConnection from '../app/domain/models/CalendarConnection.entity';
import CalendarEvent from '../app/domain/models/CalendarEvent.entity';
import CalendarFeed from '../app/domain/models/CalendarFeed.entity';
import CalendarIgnoreRule from '../app/domain/models/CalendarIgnoreRule.entity';
import CalendarSource from '../app/domain/models/CalendarSource.entity';
import ManualUnavailability from '../app/domain/models/ManualUnavailability.entity';
import OAuthState from '../app/domain/models/OAuthState.entity';
import OccurrenceParticipant from '../app/domain/models/OccurrenceParticipant.entity';
import PushSubscription from '../app/domain/models/PushSubscription.entity';
import RefreshToken from '../app/domain/models/RefreshToken.entity';
import Tournament from '../app/domain/models/Tournament.entity';
import TournamentEntry from '../app/domain/models/TournamentEntry.entity';
import TournamentEntryMember from '../app/domain/models/TournamentEntryMember.entity';
import TournamentMatch from '../app/domain/models/TournamentMatch.entity';
import User from '../app/domain/models/User.entity';
import WeeklyUnavailabilityRule from '../app/domain/models/WeeklyUnavailabilityRule.entity';

/**
 * TypeORM owns runtime queries. Knex owns schema.
 *
 * `synchronize` is off in every environment, including development. It is the
 * feature that silently drops a column when an entity changes, and this
 * database will hold the only record of who scored what and when.
 *
 * Entities are listed explicitly rather than globbed. A glob resolves
 * differently between `tsx` and compiled output, and the failure mode is an
 * entity that quietly does not exist. Each task that adds an entity adds it
 * here.
 */
export const AppDataSource = new DataSource({
    type: 'mysql',
    host: databaseConfig.host,
    port: databaseConfig.port,
    username: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    synchronize: false,
    logging: false,
    // Every timestamp is stored and read as UTC. Leaving this to the server's
    // local zone silently shifts stored times when the clocks change.
    timezone: 'Z',
    // DATE columns are calendar dates with no instant, so they come back as
    // 'YYYY-MM-DD' strings. Inflating them to midnight Date objects and then
    // formatting with local getters would shift the day on a server west of UTC.
    dateStrings: ['DATE'],
    entities: [
        User,
        RefreshToken,
        OAuthState,
        EmailToken,
        Group,
        GroupMember,
        GroupWidget,
        GroupInvite,
        NotificationSetting,
        PushSubscription,
        Activity,
        ActivityInterest,
        ActivityOccurrence,
        OccurrenceParticipant,
        CalendarConnection,
        CalendarSource,
        CalendarFeed,
        CalendarEvent,
        CalendarIgnoreRule,
        ManualUnavailability,
        WeeklyUnavailabilityRule,
        Leaderboard,
        LeaderboardEditor,
        LeaderboardMember,
        LeaderboardScoreMonthly,
        LeaderboardScoreYearly,
        LeaderboardScoreTotal,
        LeaderboardScoreHistory,
        Tournament,
        TournamentEntry,
        TournamentEntryMember,
        TournamentMatch,
    ],
});

export async function connectDatabase(): Promise<void> {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        await pinSessionToUtc();
    }
}

/**
 * Releases the pool, so a stopping process stops rather than lingering.
 *
 * Safe to call when nothing was ever opened, which is the case if startup failed
 * before `connectDatabase`.
 */
export async function closeDatabase(): Promise<void> {
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }
}

/**
 * Makes the server's own clock agree with ours.
 *
 * `timezone: 'Z'` above only tells the driver how to read and write values it
 * carries. It says nothing about the **server's** session zone, which is what
 * `CURRENT_TIMESTAMP` uses, and every `created_at` in this schema defaults to
 * that. On a machine set to Amsterdam the result is a row stamped two hours
 * away from the UTC values beside it.
 *
 * Set per connection rather than globally: the production database is shared
 * hosting, and changing a global would be reaching outside this application.
 *
 * The pool hook covers connections opened later; the direct query covers the
 * ones already open, because a pool starts with at least one.
 */
async function pinSessionToUtc(): Promise<void> {
    const driver = AppDataSource.driver as unknown as {
        pool?: { on?: (event: string, listener: (connection: unknown) => void) => void };
    };

    driver.pool?.on?.('connection', (connection) => {
        (connection as { query: (sql: string) => void }).query("SET time_zone = '+00:00'");
    });

    await AppDataSource.query("SET time_zone = '+00:00'");
}
