import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { DeepPartial } from 'typeorm';
import {
    ActivityCategory,
    DateMode,
    Daypart,
    EditMode,
    LeaderboardPeriod,
    CalendarConnectionStatus,
    CalendarProviderKey,
    GroupAccess,
    GroupRole,
    Locale,
    OccurrenceStatus,
    ParticipantMode,
    ScoreType,
    SortOrder,
    TournamentFormat,
    TournamentStatus,
    Weekday,
    slugify,
} from '@bzim/types';

import Activity from '../../src/app/models/Activity.entity';
import CalendarConnection from '../../src/app/models/CalendarConnection.entity';
import CalendarSource from '../../src/app/models/CalendarSource.entity';
import Crypt from '../../src/app/utils/Crypt';
import ActivityInterest from '../../src/app/models/ActivityInterest.entity';
import ActivityOccurrence from '../../src/app/models/ActivityOccurrence.entity';
import Group from '../../src/app/models/Group.entity';
import GroupMember from '../../src/app/models/GroupMember.entity';
import Leaderboard from '../../src/app/models/Leaderboard.entity';
import LeaderboardMember from '../../src/app/models/LeaderboardMember.entity';
import ManualUnavailability from '../../src/app/models/ManualUnavailability.entity';
import OccurrenceParticipant from '../../src/app/models/OccurrenceParticipant.entity';
import Tournament from '../../src/app/models/Tournament.entity';
import TournamentEntry from '../../src/app/models/TournamentEntry.entity';
import TournamentEntryMember from '../../src/app/models/TournamentEntryMember.entity';
import User from '../../src/app/models/User.entity';
import WeeklyUnavailabilityRule from '../../src/app/models/WeeklyUnavailabilityRule.entity';

import { generateToken } from '../../src/app/utils/Token';

/**
 * Seed helpers, written through the entities rather than raw SQL.
 *
 * Going through TypeORM means a column rename breaks the factories at compile
 * time instead of at the first assertion, and the fixtures cannot drift into a
 * shape the application could never produce.
 *
 * Every helper takes overrides so a test can state only the thing it is about.
 * A test that reads `seedGroup(owner, { access: GroupAccess.PUBLIC })` says
 * what it cares about; one that spells out six fields hides it.
 */

let counter = 0;

/** A user who has finished onboarding. Each call gets its own unique fields. */
export async function seedUser(overrides: DeepPartial<User> = {}): Promise<User> {
    counter += 1;
    const n = String(counter).padStart(3, '0');
    const user = User.create({
        googleSub: `google-sub-${randomUUID()}`,
        email: `user${n}-${randomUUID().slice(0, 8)}@example.com`,
        handle: `user${n}_${randomUUID().slice(0, 6)}`,
        displayName: `User ${n}`,
        avatarKey: 'cat',
        passwordHash: null,
        emailVerifiedAt: DateTime.utc().toJSDate(),
        locale: Locale.NL,
        lastLoginAt: DateTime.utc().toJSDate(),
    });
    Object.assign(user, overrides);
    return user.save();
}

/** A group with its owner membership, as `GroupService.create` would make it. */
export async function seedGroup(owner: User, overrides: DeepPartial<Group> = {}): Promise<Group> {
    counter += 1;
    const name = `Group ${String(counter)}`;
    const access = overrides.access ?? GroupAccess.INVITE_ONLY;
    const group = Group.create({
        name,
        slug: slugify(name),
        description: null,
        imageUrl: null,
        imageCreditName: null,
        imageCreditUrl: null,
        access,
        inviteToken: Group.usesInviteLink(access) ? generateToken() : null,
        ownerId: owner.id,
    });
    Object.assign(group, overrides);
    // The slug follows whatever name the override chose, as the service would.
    group.slug = overrides.slug ?? slugify(group.name);
    await group.save();
    await GroupMember.create({ groupId: group.id, userId: owner.id, role: GroupRole.OWNER }).save();
    return group;
}

export async function seedMember(
    group: Group,
    user: User,
    role: GroupRole = GroupRole.MEMBER,
): Promise<GroupMember> {
    return GroupMember.create({ groupId: group.id, userId: user.id, role }).save();
}

/** An idea without a date by default; override `dateMode` and friends for the other shapes. */
export async function seedActivity(
    group: Group,
    creator: User,
    overrides: DeepPartial<Activity> = {},
): Promise<Activity> {
    counter += 1;
    const activity = Activity.create({
        groupId: group.id,
        createdById: creator.id,
        creatorNameSnapshot: null,
        category: ActivityCategory.OTHER,
        title: `Activity ${String(counter)}`,
        description: null,
        imageUrl: null,
        imageCreditName: null,
        imageCreditUrl: null,
        isRecurring: false,
        dateMode: DateMode.NONE,
        specificDate: null,
        weekday: null,
        startTime: null,
        locationText: null,
        locationUrl: null,
        minPeople: null,
        maxPeople: null,
        costPerPerson: null,
        durationMinutes: null,
        externalUrl: null,
        preferredDayparts: null,
        isActive: true,
    });
    Object.assign(activity, overrides);
    return activity.save();
}

export async function seedInterest(activity: Activity, user: User): Promise<ActivityInterest> {
    return ActivityInterest.create({
        activityId: activity.id,
        userId: user.id,
        addedById: null,
    }).save();
}

/** A planned occurrence on `date` with no participants; add them with `seedParticipant`. */
export async function seedOccurrence(
    activity: Activity,
    plannedBy: User,
    overrides: DeepPartial<ActivityOccurrence> = {},
): Promise<ActivityOccurrence> {
    const occurrence = ActivityOccurrence.create({
        activityId: activity.id,
        date: '2026-11-01',
        daypart: null,
        startTime: null,
        status: OccurrenceStatus.PLANNED,
        plannedById: plannedBy.id,
        notes: null,
    });
    Object.assign(occurrence, overrides);
    return occurrence.save();
}

export async function seedParticipant(
    occurrence: ActivityOccurrence,
    user: User,
): Promise<OccurrenceParticipant> {
    return OccurrenceParticipant.create({
        occurrenceId: occurrence.id,
        userId: user.id,
        notifiedAt: null,
        notifiedForDate: null,
        notifiedForDaypart: null,
        notifiedForStartTime: null,
        remindedAt: null,
        calendarEventId: null,
    }).save();
}

export async function seedBlock(
    user: User,
    date: string,
    daypart: Daypart,
): Promise<ManualUnavailability> {
    return ManualUnavailability.create({ userId: user.id, date, daypart }).save();
}

export async function seedRule(
    user: User,
    weekday: Weekday,
    daypart: Daypart,
    overrides: DeepPartial<WeeklyUnavailabilityRule> = {},
): Promise<WeeklyUnavailabilityRule> {
    const rule = WeeklyUnavailabilityRule.create({
        userId: user.id,
        weekday,
        daypart,
        validFrom: null,
        validUntil: null,
    });
    Object.assign(rule, overrides);
    return rule.save();
}

/** A number board, highest first, everyone may edit, all periods shown. */
export async function seedLeaderboard(
    group: Group,
    creator: User,
    overrides: DeepPartial<Leaderboard> = {},
): Promise<Leaderboard> {
    counter += 1;
    const leaderboard = Leaderboard.create({
        groupId: group.id,
        createdById: creator.id,
        creatorNameSnapshot: null,
        name: `Leaderboard ${String(counter)}`,
        description: null,
        scoreType: ScoreType.NUMBER,
        sortOrder: SortOrder.DESC,
        editMode: EditMode.EVERYONE,
        showMonthly: true,
        showYearly: true,
        showAllTime: true,
        showSteppers: false,
        cardPeriod: LeaderboardPeriod.TOTAL,
    });
    Object.assign(leaderboard, overrides);
    return leaderboard.save();
}

export async function seedLeaderboardMember(
    leaderboard: Leaderboard,
    user: User,
): Promise<LeaderboardMember> {
    return LeaderboardMember.create({
        leaderboardId: leaderboard.id,
        userId: user.id,
        displayNameSnapshot: user.displayName ?? '',
        avatarKeySnapshot: user.avatarKey ?? 'cat',
        addedById: null,
        removedAt: null,
    }).save();
}

/** A players knockout in draft, no third place. */
export async function seedTournament(
    group: Group,
    creator: User,
    overrides: DeepPartial<Tournament> = {},
): Promise<Tournament> {
    counter += 1;
    const tournament = Tournament.create({
        groupId: group.id,
        activityId: null,
        createdById: creator.id,
        creatorNameSnapshot: null,
        name: `Tournament ${String(counter)}`,
        description: null,
        format: TournamentFormat.KNOCKOUT,
        participantMode: ParticipantMode.PLAYERS,
        teamSize: null,
        status: TournamentStatus.DRAFT,
        winPoints: 3,
        drawPoints: 1,
        groupCount: null,
        advancePerGroup: null,
        thirdPlace: false,
        winnerEntryId: null,
        startedAt: null,
        finishedAt: null,
    });
    Object.assign(tournament, overrides);
    return tournament.save();
}

/** An entry with the given people in it; a member brings their name and avatar, a string is a guest. */
export async function seedTournamentEntry(
    tournament: Tournament,
    seed: number,
    people: (User | string)[],
    name?: string,
): Promise<TournamentEntry> {
    const entry = await TournamentEntry.create({
        tournamentId: tournament.id,
        name:
            name ??
            people
                .map((person) => (typeof person === 'string' ? person : (person.displayName ?? '')))
                .join(' & '),
        seed,
        groupNo: null,
    }).save();
    for (const person of people) {
        await TournamentEntryMember.create({
            entryId: entry.id,
            userId: typeof person === 'string' ? null : person.id,
            displayNameSnapshot: typeof person === 'string' ? person : (person.displayName ?? ''),
            avatarKeySnapshot: typeof person === 'string' ? null : person.avatarKey,
        }).save();
    }
    return entry;
}

export async function seedCalendarConnection(
    user: User,
    overrides: Partial<
        Pick<
            CalendarConnection,
            'accountEmail' | 'refreshToken' | 'accessToken' | 'hasWriteScope' | 'status'
        >
    > = {},
): Promise<CalendarConnection> {
    counter += 1;
    const accountEmail = overrides.accountEmail ?? `agenda${String(counter)}@example.test`;
    return CalendarConnection.create({
        userId: user.id,
        provider: CalendarProviderKey.GOOGLE,
        accountEmail,
        accountEmailHash: Crypt.searchHash(accountEmail),
        refreshToken: overrides.refreshToken ?? `refresh-${String(counter)}`,
        accessToken: overrides.accessToken ?? null,
        accessTokenExpiresAt: null,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        hasWriteScope: overrides.hasWriteScope ?? false,
        status: overrides.status ?? CalendarConnectionStatus.ACTIVE,
        lastSyncedAt: null,
        lastError: null,
    }).save();
}

export async function seedCalendarSource(
    connection: CalendarConnection,
    overrides: Partial<
        Pick<CalendarSource, 'providerCalendarId' | 'name' | 'isPrimary' | 'enabled'>
    > = {},
): Promise<CalendarSource> {
    counter += 1;
    return CalendarSource.create({
        connectionId: connection.id,
        providerCalendarId: overrides.providerCalendarId ?? `cal-${String(counter)}`,
        name: overrides.name ?? `Calendar ${String(counter)}`,
        isPrimary: overrides.isPrimary ?? false,
        enabled: overrides.enabled ?? true,
        timeZone: 'Europe/Amsterdam',
    }).save();
}
