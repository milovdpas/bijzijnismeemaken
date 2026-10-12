import { In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { AVATAR_KEYS, OccurrenceStatus } from '@bzim/types';

import Activity from '../models/Activity.entity';
import ActivityInterest from '../models/ActivityInterest.entity';
import ActivityOccurrence from '../models/ActivityOccurrence.entity';
import type Group from '../models/Group.entity';
import Leaderboard from '../models/Leaderboard.entity';
import LeaderboardEditor from '../models/LeaderboardEditor.entity';
import LeaderboardMember from '../models/LeaderboardMember.entity';
import LeaderboardScoreHistory from '../models/LeaderboardScoreHistory.entity';
import OccurrenceParticipant from '../models/OccurrenceParticipant.entity';
import Tournament from '../models/Tournament.entity';
import TournamentEntry from '../models/TournamentEntry.entity';
import TournamentEntryMember from '../models/TournamentEntryMember.entity';
import User from '../models/User.entity';
import { CalendarWriteService } from './CalendarWriteService';
import { NotificationService } from './NotificationService';

/** An occurrence that was cancelled by somebody's departure, with the people who had been told about it. */
export interface CancelledByDeparture {
    activity: Activity;
    occurrence: ActivityOccurrence;
    rows: OccurrenceParticipant[];
    /** Every participant, for the calendar events that were written for them. */
    everyone: OccurrenceParticipant[];
}

/** What `detach` leaves for after the commit: cancellations to mail, calendar events to take out. */
export interface Departure {
    cancelled: CancelledByDeparture[];
    /** The leaver's own participations elsewhere, as they were before deletion. */
    left: OccurrenceParticipant[];
}

/**
 * What happens to somebody's traces in a group when they leave it or are
 * removed (docs/01 §1.6). Their activities lose their creator, keep the
 * name as a snapshot and go inactive, and whatever was planned for them is
 * cancelled; their interests and participations go; their leaderboard rows
 * keep name and face as snapshots but no longer point at them; the boards
 * they created and the history lines they wrote are decoupled the same way;
 * their editor rows go. Tournaments likewise: the entries keep their names
 * and avatars, the person behind them goes, and a tournament they organised
 * keeps their name as its organiser. Runs inside the membership transaction; the
 * cancellation mails are sent by `notify` once that has committed.
 */
export class DepartureService {
    static async detach(manager: EntityManager, group: Group, userId: string): Promise<Departure> {
        const user = await manager.findOneByOrFail(User, { id: userId });
        const name = user.displayName ?? user.handle ?? '';
        const avatarKey = user.avatarKey ?? AVATAR_KEYS[0];

        const activityIds = (
            await manager.find(Activity, { where: { groupId: group.id }, select: { id: true } })
        ).map((activity) => activity.id);
        const occurrenceIds =
            activityIds.length === 0
                ? []
                : (
                      await manager.find(ActivityOccurrence, {
                          where: { activityId: In(activityIds) },
                          select: { id: true },
                      })
                  ).map((occurrence) => occurrence.id);
        const leaderboardIds = (
            await manager.find(Leaderboard, { where: { groupId: group.id }, select: { id: true } })
        ).map((leaderboard) => leaderboard.id);

        // Their activities: orphaned, hidden, and nothing planned for them any more.
        const own = await manager.find(Activity, {
            where: { groupId: group.id, createdById: userId },
        });
        for (const activity of own) {
            activity.createdById = null;
            activity.creatorNameSnapshot = name;
            activity.isActive = false;
        }
        await manager.save(own);
        const cancelled: CancelledByDeparture[] = [];
        if (own.length > 0) {
            const open = await manager.find(ActivityOccurrence, {
                where: {
                    activityId: In(own.map((activity) => activity.id)),
                    status: OccurrenceStatus.PLANNED,
                },
                relations: { participants: { user: true } },
            });
            for (const occurrence of open) {
                occurrence.status = OccurrenceStatus.CANCELLED;
                const activity = own.find((candidate) => candidate.id === occurrence.activityId);
                if (activity !== undefined) {
                    cancelled.push({
                        activity,
                        occurrence,
                        rows: occurrence.participants.filter((row) => row.notifiedAt !== null),
                        everyone: occurrence.participants,
                    });
                }
            }
            await manager.save(open);
        }

        // Their interest in and attendance at the group's activities.
        if (activityIds.length > 0) {
            await manager.delete(ActivityInterest, { userId, activityId: In(activityIds) });
        }
        const left =
            occurrenceIds.length === 0
                ? []
                : await manager.findBy(OccurrenceParticipant, {
                      userId,
                      occurrenceId: In(occurrenceIds),
                  });
        if (left.length > 0) {
            await manager.delete(OccurrenceParticipant, { id: In(left.map((row) => row.id)) });
        }

        // Leaderboards: the rows stay, the person behind them goes.
        if (leaderboardIds.length > 0) {
            await manager.update(
                Leaderboard,
                { groupId: group.id, createdById: userId },
                { createdById: null, creatorNameSnapshot: name },
            );
            await manager.delete(LeaderboardEditor, { userId, leaderboardId: In(leaderboardIds) });
            await manager.update(
                LeaderboardMember,
                { userId, leaderboardId: In(leaderboardIds) },
                { userId: null, displayNameSnapshot: name, avatarKeySnapshot: avatarKey },
            );
            await manager.update(
                LeaderboardScoreHistory,
                { changedById: userId, leaderboardId: In(leaderboardIds) },
                { changedById: null, changedByNameSnapshot: name },
            );
            // A private board is seen by the people on it only. With the last
            // of them gone nobody ever could again, so it goes, scores and all.
            const unseen = (
                await manager.find(Leaderboard, {
                    where: { groupId: group.id, isPrivate: true },
                    relations: { members: true },
                })
            ).filter(
                (board) =>
                    !board.members.some((member) => member.userId !== null && member.isActive()),
            );
            if (unseen.length > 0) {
                await manager.delete(Leaderboard, { id: In(unseen.map((board) => board.id)) });
            }
        }

        // Tournaments: entries and organiser keep the name, not the person.
        await manager.update(
            Tournament,
            { groupId: group.id, createdById: userId },
            { createdById: null, creatorNameSnapshot: name },
        );
        const tournamentIds = (
            await manager.find(Tournament, { where: { groupId: group.id }, select: { id: true } })
        ).map((tournament) => tournament.id);
        const entryIds =
            tournamentIds.length === 0
                ? []
                : (
                      await manager.find(TournamentEntry, {
                          where: { tournamentId: In(tournamentIds) },
                          select: { id: true },
                      })
                  ).map((entry) => entry.id);
        if (entryIds.length > 0) {
            await manager.update(
                TournamentEntryMember,
                { userId, entryId: In(entryIds) },
                { userId: null, displayNameSnapshot: name, avatarKeySnapshot: avatarKey },
            );
        }

        return { cancelled, left };
    }

    /**
     * After the commit: the people who had been told about a now-cancelled
     * occurrence hear it is off, and every calendar event that was written for
     * those occurrences, or for the leaver elsewhere, is taken out again.
     */
    static async notify(group: Group, departure: Departure): Promise<void> {
        await Promise.all(
            departure.cancelled
                .filter((entry) => entry.rows.length > 0)
                .map((entry) =>
                    NotificationService.occurrenceCancelled(
                        group,
                        entry.activity,
                        entry.occurrence,
                        entry.rows,
                    ),
                ),
        );
        await CalendarWriteService.remove([
            ...departure.cancelled.flatMap((entry) => entry.everyone),
            ...departure.left,
        ]);
    }
}
