import { In } from 'typeorm';
import type { EntityManager, FindOptionsRelations } from 'typeorm';
import {
    ActivityCategory,
    ParticipantMode,
    TOURNAMENT,
    TournamentFormat,
    TournamentStatus,
} from '@bzim/types';
import type {
    AvatarKey,
    TournamentDetailDto,
    TournamentEntryInput,
    TournamentEntryPatch,
    TournamentInput,
    TournamentListingDto,
    TournamentPersonInput,
    TournamentSettings,
} from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import Activity from '../models/Activity.entity';
import type Group from '../models/Group.entity';
import GroupMember from '../models/GroupMember.entity';
import Tournament from '../models/Tournament.entity';
import TournamentEntry from '../models/TournamentEntry.entity';
import TournamentEntryMember from '../models/TournamentEntryMember.entity';
import type User from '../models/User.entity';
import { snakeGroups } from '../modules/tournaments/round-robin';
import TournamentPresenter from '../presenters/TournamentPresenter';
import { shuffle } from '../utils/Random';
import { TournamentPlayService } from './TournamentPlayService';

/**
 * Every reason a tournament action is refused. Each method returns only the
 * ones it can produce (`TournamentResult<'NOT_DRAFT' | 'FULL'>`), so a
 * handler's switch lists real cases only.
 */
export type TournamentProblem =
    /** Settings, entries, the draw and the start need a draft. */
    | 'NOT_DRAFT'
    /** Results, advancing and finishing need a running tournament. */
    | 'NOT_RUNNING'
    /** Teams need a team size; an entry has more people than a team, or a player is not one. */
    | 'TEAM_SIZE'
    /** A group stage needs a group count and how many go through; a group out of range. */
    | 'GROUPS'
    /** A draw cannot be worth more than a win. */
    | 'POINTS'
    /** Not a tournament activity of this group. */
    | 'ACTIVITY'
    /** The entry list is full. */
    | 'FULL'
    /** Somebody plays in another entry already, or twice in this one. */
    | 'ALREADY_IN'
    /** Somebody is not in the group, or has no profile yet. */
    | 'NOT_A_GROUP_MEMBER'
    /** Starting needs two entries, and two in every group. */
    | 'TOO_FEW_ENTRIES'
    /** More go through than a group holds, or fewer than two in all. */
    | 'ADVANCE'
    /** Random teams need people for two teams at least. */
    | 'TOO_FEW_PEOPLE'
    /** A match without two sides: a bye, or one still waiting for a winner. */
    | 'NOT_READY'
    /** A knockout match needs a winner. */
    | 'DRAW_IN_KNOCKOUT'
    /** A result by somebody who is neither the organiser, an admin, nor a side's player while it has none. */
    | 'FORBIDDEN'
    /** A later match was played on this result; that one has to be cleared first. */
    | 'LATER_PLAYED'
    /** Only a group stage advances. */
    | 'NOT_GROUPS'
    /** Group matches are still to be played. */
    | 'GROUPS_UNFINISHED'
    /** The knockout is drawn already. */
    | 'ALREADY_ADVANCED'
    /** The final has no result yet. */
    | 'FINAL_UNPLAYED';

export type TournamentResult<P extends TournamentProblem> =
    { ok: true; tournament: Tournament } | { ok: false; problem: P };

/** Settings that do not fit together, from `create` and `update` alike. */
type SettingsProblem = 'TEAM_SIZE' | 'GROUPS' | 'POINTS';

/** People who cannot go into an entry. */
type PeopleProblem = 'ALREADY_IN' | 'NOT_A_GROUP_MEMBER';

interface Person {
    userId: string | null;
    name: string;
    avatarKey: AvatarKey | null;
}

type PeopleResult = { ok: true; people: Person[] } | { ok: false; problem: PeopleProblem };

const RELATIONS: FindOptionsRelations<Tournament> = {
    createdBy: true,
    activity: true,
    entries: { members: { user: true } },
    matches: true,
};

/** Seeds are unique per tournament, so a reorder passes every entry through this offset first. */
const SEED_OFFSET = 1000;

/**
 * Tournaments before they start (docs/01 §1.5c): settings, entries, the
 * draw; and finding, listing and deleting them. Any member creates one;
 * changing it is the organiser's or an admin's, which `requireTournamentManager`
 * checks on the route before any of this runs. Playing is
 * `TournamentPlayService`.
 */
export class TournamentService {
    static async create(
        group: Group,
        creator: User,
        input: TournamentInput,
    ): Promise<TournamentResult<SettingsProblem | 'ACTIVITY'>> {
        const settings = TournamentService.normalise({
            name: input.name,
            description: input.description ?? null,
            format: input.format,
            participantMode: input.participantMode,
            teamSize: input.teamSize ?? null,
            winPoints: input.winPoints ?? 3,
            drawPoints: input.drawPoints ?? 1,
            groupCount: input.groupCount ?? null,
            advancePerGroup: input.advancePerGroup ?? null,
            thirdPlace: input.thirdPlace ?? false,
        });
        const problem = TournamentService.settingsProblem(settings);
        if (problem !== null) return { ok: false, problem };

        let activityId: string | null = null;
        if (input.activityId !== undefined && input.activityId !== null) {
            const activity = await Activity.findOneBy({
                id: input.activityId,
                groupId: group.id,
                isActive: true,
            });
            if (activity === null || activity.category !== ActivityCategory.TOURNAMENT) {
                return { ok: false, problem: 'ACTIVITY' };
            }
            activityId = activity.id;
        }

        const created = await Tournament.create({
            ...settings,
            groupId: group.id,
            activityId,
            createdById: creator.id,
            creatorNameSnapshot: null,
            status: TournamentStatus.DRAFT,
            winnerEntryId: null,
            startedAt: null,
            finishedAt: null,
        }).save();
        return { ok: true, tournament: await TournamentService.reload(created.id) };
    }

    /**
     * Settings. The name and description can change at any time; the rest
     * only while a draft. A new group count deals the entries over the groups
     * again by seed.
     */
    static async update(
        tournament: Tournament,
        patch: Partial<TournamentSettings>,
    ): Promise<TournamentResult<'NOT_DRAFT' | SettingsProblem>> {
        const structural = Object.entries(patch).some(
            ([key, value]) => value !== undefined && key !== 'name' && key !== 'description',
        );
        if (structural && tournament.status !== TournamentStatus.DRAFT) {
            return { ok: false, problem: 'NOT_DRAFT' };
        }
        const settings = TournamentService.normalise({
            name: tournament.name,
            description: tournament.description,
            format: tournament.format,
            participantMode: tournament.participantMode,
            teamSize: tournament.teamSize,
            winPoints: tournament.winPoints,
            drawPoints: tournament.drawPoints,
            groupCount: tournament.groupCount,
            advancePerGroup: tournament.advancePerGroup,
            thirdPlace: tournament.thirdPlace,
            ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
        });
        const problem = TournamentService.settingsProblem(settings);
        if (problem !== null) return { ok: false, problem };
        const regroup =
            settings.format !== tournament.format || settings.groupCount !== tournament.groupCount;

        await AppDataSource.transaction(async (manager) => {
            await manager.update(Tournament, tournament.id, settings);
            if (regroup) {
                await TournamentService.renumber(
                    manager,
                    TournamentService.bySeed(tournament.entries),
                    settings,
                );
            }
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    static async delete(tournament: Tournament): Promise<void> {
        await Tournament.delete({ id: tournament.id });
    }

    /**
     * A member or a guest as a player, or a team. In a team tournament a
     * single person is a team of one, which is how the people for random
     * teams are gathered. A new entry takes the next seed, and in a group
     * stage the group that seed gets dealt.
     */
    static async addEntry(
        tournament: Tournament,
        input: TournamentEntryInput,
    ): Promise<TournamentResult<'NOT_DRAFT' | 'FULL' | 'TEAM_SIZE' | PeopleProblem>> {
        if (tournament.status !== TournamentStatus.DRAFT) {
            return { ok: false, problem: 'NOT_DRAFT' };
        }
        if (tournament.entries.length >= TOURNAMENT.MAX_ENTRIES) {
            return { ok: false, problem: 'FULL' };
        }
        const wanted: TournamentPersonInput[] =
            input.members ??
            (input.userId !== undefined ? [{ userId: input.userId }] : [{ name: input.name }]);
        if (!TournamentService.fits(tournament, wanted.length)) {
            return { ok: false, problem: 'TEAM_SIZE' };
        }
        const resolved = await TournamentService.resolvePeople(tournament, wanted, null);
        if (!resolved.ok) return resolved;

        const seed = tournament.entries.length + 1;
        const name =
            (input.members !== undefined ? input.name : undefined) ??
            TournamentService.nameFor(resolved.people);
        await AppDataSource.transaction(async (manager) => {
            const entry = await manager.save(
                manager.create(TournamentEntry, {
                    tournamentId: tournament.id,
                    name,
                    seed,
                    groupNo: TournamentService.groupFor(tournament, seed),
                }),
            );
            await TournamentService.saveMembers(manager, entry.id, resolved.people);
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /**
     * Name, people, place in the draw, group. A new seed moves the entry
     * there and shifts the others; a player's name follows a new person
     * unless a name is given too.
     */
    static async updateEntry(
        tournament: Tournament,
        entry: TournamentEntry,
        patch: TournamentEntryPatch,
    ): Promise<TournamentResult<'NOT_DRAFT' | 'GROUPS' | 'TEAM_SIZE' | PeopleProblem>> {
        if (tournament.status !== TournamentStatus.DRAFT) {
            return { ok: false, problem: 'NOT_DRAFT' };
        }
        if (
            patch.groupNo !== undefined &&
            (tournament.format !== TournamentFormat.GROUPS_KNOCKOUT ||
                patch.groupNo > (tournament.groupCount ?? 0))
        ) {
            return { ok: false, problem: 'GROUPS' };
        }
        let people: Person[] | null = null;
        if (patch.members !== undefined) {
            if (!TournamentService.fits(tournament, patch.members.length)) {
                return { ok: false, problem: 'TEAM_SIZE' };
            }
            const resolved = await TournamentService.resolvePeople(
                tournament,
                patch.members,
                entry.id,
            );
            if (!resolved.ok) return resolved;
            people = resolved.people;
        }
        const name =
            patch.name ??
            (people !== null && tournament.participantMode === ParticipantMode.PLAYERS
                ? TournamentService.nameFor(people)
                : undefined);

        await AppDataSource.transaction(async (manager) => {
            if (name !== undefined) await manager.update(TournamentEntry, entry.id, { name });
            if (patch.groupNo !== undefined) {
                await manager.update(TournamentEntry, entry.id, { groupNo: patch.groupNo });
            }
            if (people !== null) {
                await manager.delete(TournamentEntryMember, { entryId: entry.id });
                await TournamentService.saveMembers(manager, entry.id, people);
            }
            if (patch.seed !== undefined) {
                const others = TournamentService.bySeed(tournament.entries).filter(
                    (other) => other.id !== entry.id,
                );
                others.splice(Math.min(patch.seed, others.length + 1) - 1, 0, entry);
                await TournamentService.renumber(manager, others, null);
            }
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /** Out of the draft; the seeds behind it close up, the groups stay as they were. */
    static async removeEntry(
        tournament: Tournament,
        entry: TournamentEntry,
    ): Promise<TournamentResult<'NOT_DRAFT'>> {
        if (tournament.status !== TournamentStatus.DRAFT) {
            return { ok: false, problem: 'NOT_DRAFT' };
        }
        await AppDataSource.transaction(async (manager) => {
            await manager.delete(TournamentEntry, { id: entry.id });
            await TournamentService.renumber(
                manager,
                TournamentService.bySeed(tournament.entries).filter(
                    (other) => other.id !== entry.id,
                ),
                null,
            );
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /**
     * The draw: the seeds in a random order, and in a group stage the groups
     * dealt again from them. With `teams`, everybody in the entries is first
     * dealt into random teams, as even as they come out: as many teams as
     * the team size needs, sizes differing by one at most.
     */
    static async draw(
        tournament: Tournament,
        teams: boolean,
    ): Promise<TournamentResult<'NOT_DRAFT' | 'TOO_FEW_PEOPLE'>> {
        if (tournament.status !== TournamentStatus.DRAFT) {
            return { ok: false, problem: 'NOT_DRAFT' };
        }
        const randomTeams = teams && tournament.participantMode === ParticipantMode.TEAMS;
        const people = tournament.entries.flatMap((entry) =>
            entry.members.map((member) => ({
                userId: member.userId,
                name: member.displayNameSnapshot,
                avatarKey: member.avatarKeySnapshot,
            })),
        );
        const teamCount = Math.ceil(people.length / (tournament.teamSize ?? 1));
        if (randomTeams && teamCount < 2) return { ok: false, problem: 'TOO_FEW_PEOPLE' };

        await AppDataSource.transaction(async (manager) => {
            let entries = tournament.entries;
            if (randomTeams) {
                await manager.delete(TournamentEntry, { tournamentId: tournament.id });
                const shuffled = shuffle(people);
                entries = [];
                for (let team = 0; team < teamCount; team += 1) {
                    const members = shuffled.filter((_, index) => index % teamCount === team);
                    const entry = await manager.save(
                        manager.create(TournamentEntry, {
                            tournamentId: tournament.id,
                            name: TournamentService.nameFor(members),
                            seed: SEED_OFFSET * 2 + team,
                            groupNo: null,
                        }),
                    );
                    await TournamentService.saveMembers(manager, entry.id, members);
                    entries.push(entry);
                }
            }
            await TournamentService.renumber(manager, shuffle(entries), tournament);
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /** What is on (running first, then drafts, newest first), the archive, or one activity's. */
    static async list(
        group: Group,
        status: TournamentStatus | undefined,
        activityId: string | undefined,
    ): Promise<TournamentListingDto[]> {
        const statuses =
            status !== undefined
                ? [status]
                : activityId !== undefined
                  ? Object.values(TournamentStatus)
                  : [TournamentStatus.RUNNING, TournamentStatus.DRAFT];
        const tournaments = await Tournament.find({
            where: {
                groupId: group.id,
                status: In(statuses),
                ...(activityId === undefined ? {} : { activityId }),
            },
            relations: { createdBy: true, entries: true },
        });
        const order = [TournamentStatus.RUNNING, TournamentStatus.DRAFT, TournamentStatus.FINISHED];
        tournaments.sort(
            (a, b) =>
                order.indexOf(a.status) - order.indexOf(b.status) ||
                (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0) ||
                b.createdAt.getTime() - a.createdAt.getTime(),
        );
        return tournaments.map((tournament) => TournamentPresenter.listing(tournament));
    }

    static findForGroup(group: Group, tournamentId: string): Promise<Tournament | null> {
        return Tournament.findOne({
            where: { id: tournamentId, groupId: group.id },
            relations: RELATIONS,
        });
    }

    static detail(tournament: Tournament, viewer: GroupMember): TournamentDetailDto {
        const canManage = tournament.isManagedBy(viewer);
        return TournamentPresenter.detail(tournament, {
            viewerId: viewer.userId,
            canManage,
            startProblem:
                tournament.status === TournamentStatus.DRAFT
                    ? TournamentPlayService.startProblem(tournament)
                    : null,
            canAdvance: TournamentPlayService.canAdvance(tournament),
            canFinish: TournamentPlayService.canFinish(tournament),
            groups: TournamentPlayService.groupTables(tournament),
            canReport: (match) => TournamentPlayService.canReport(tournament, match, viewer),
        });
    }

    static reload(tournamentId: string): Promise<Tournament> {
        return Tournament.findOneOrFail({ where: { id: tournamentId }, relations: RELATIONS });
    }

    static bySeed(entries: readonly TournamentEntry[]): TournamentEntry[] {
        return [...entries].sort((a, b) => a.seed - b.seed);
    }

    /** One person for a player, one up to the team size for a team. */
    private static fits(tournament: Tournament, people: number): boolean {
        return tournament.participantMode === ParticipantMode.PLAYERS
            ? people === 1
            : people >= 1 && people <= (tournament.teamSize ?? 0);
    }

    /**
     * The people named for an entry: members of the group with a profile,
     * or guests by name. Nobody plays in two entries.
     */
    private static async resolvePeople(
        tournament: Tournament,
        wanted: TournamentPersonInput[],
        exceptEntryId: string | null,
    ): Promise<PeopleResult> {
        const userIds = wanted.flatMap((person) =>
            person.userId === undefined ? [] : [person.userId],
        );
        if (new Set(userIds).size !== userIds.length) return { ok: false, problem: 'ALREADY_IN' };
        const playing = tournament.entries
            .filter((entry) => entry.id !== exceptEntryId)
            .flatMap((entry) => entry.members)
            .some((member) => member.userId !== null && userIds.includes(member.userId));
        if (playing) return { ok: false, problem: 'ALREADY_IN' };

        const members =
            userIds.length === 0
                ? []
                : await GroupMember.find({
                      where: { groupId: tournament.groupId, userId: In(userIds) },
                      relations: { user: true },
                  });
        const people: Person[] = [];
        for (const person of wanted) {
            if (person.userId === undefined) {
                people.push({ userId: null, name: person.name ?? '', avatarKey: null });
                continue;
            }
            const summary =
                members.find((member) => member.userId === person.userId)?.user.toSummary() ?? null;
            if (summary === null) return { ok: false, problem: 'NOT_A_GROUP_MEMBER' };
            people.push({
                userId: summary.id,
                name: summary.displayName,
                avatarKey: summary.avatarKey,
            });
        }
        return { ok: true, people };
    }

    private static async saveMembers(
        manager: EntityManager,
        entryId: string,
        people: Person[],
    ): Promise<void> {
        await manager.save(
            people.map((person) =>
                manager.create(TournamentEntryMember, {
                    entryId,
                    userId: person.userId,
                    displayNameSnapshot: person.name,
                    avatarKeySnapshot: person.avatarKey,
                }),
            ),
        );
    }

    /** A player's own name; a team's people, joined. */
    private static nameFor(people: Person[]): string {
        return people
            .map((person) => person.name)
            .join(' & ')
            .slice(0, TOURNAMENT.ENTRY_NAME_MAX_LENGTH);
    }

    private static groupFor(
        settings: Pick<TournamentSettings, 'format' | 'groupCount'>,
        seed: number,
    ): number | null {
        if (settings.format !== TournamentFormat.GROUPS_KNOCKOUT) return null;
        return snakeGroups(seed, settings.groupCount ?? 1)[seed - 1] ?? 1;
    }

    /**
     * Seeds 1..n in this order, through the offset so no two entries share a
     * seed halfway. With settings, the groups are dealt again from the new
     * seeds; without, every entry keeps its group.
     */
    private static async renumber(
        manager: EntityManager,
        ordered: TournamentEntry[],
        settings: Pick<TournamentSettings, 'format' | 'groupCount'> | null,
    ): Promise<void> {
        for (const [index, entry] of ordered.entries()) {
            await manager.update(TournamentEntry, entry.id, { seed: SEED_OFFSET + index + 1 });
        }
        for (const [index, entry] of ordered.entries()) {
            await manager.update(TournamentEntry, entry.id, {
                seed: index + 1,
                ...(settings === null
                    ? {}
                    : { groupNo: TournamentService.groupFor(settings, index + 1) }),
            });
        }
    }

    /** Settings that do not apply are cleared rather than refused: players have no team size. */
    private static normalise(settings: TournamentSettings): TournamentSettings {
        const groups = settings.format === TournamentFormat.GROUPS_KNOCKOUT;
        return {
            ...settings,
            teamSize: settings.participantMode === ParticipantMode.TEAMS ? settings.teamSize : null,
            groupCount: groups ? settings.groupCount : null,
            advancePerGroup: groups ? settings.advancePerGroup : null,
        };
    }

    private static settingsProblem(settings: TournamentSettings): SettingsProblem | null {
        if (settings.participantMode === ParticipantMode.TEAMS && settings.teamSize === null) {
            return 'TEAM_SIZE';
        }
        if (
            settings.format === TournamentFormat.GROUPS_KNOCKOUT &&
            (settings.groupCount === null || settings.advancePerGroup === null)
        ) {
            return 'GROUPS';
        }
        if (settings.drawPoints > settings.winPoints) return 'POINTS';
        return null;
    }
}
