import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { EntityManager } from 'typeorm';
import {
    MatchSlot,
    MatchStage,
    MatchStatus,
    ParticipantMode,
    TOURNAMENT,
    TournamentFormat,
    TournamentStatus,
} from '@bzim/types';
import type { MatchResultInput } from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import type GroupMember from '../models/GroupMember.entity';
import Tournament from '../models/Tournament.entity';
import TournamentMatch from '../models/TournamentMatch.entity';
import { knockoutPlan, thirdPlaceSlot } from '../modules/tournaments/bracket';
import type { PlannedMatch } from '../modules/tournaments/bracket';
import { roundRobinPlan } from '../modules/tournaments/round-robin';
import { qualifiers, standings } from '../modules/tournaments/standings';
import type { StandingRow } from '../modules/tournaments/standings';
import { TournamentService } from './TournamentService';
import type { TournamentResult } from './TournamentService';

export interface GroupTable {
    groupNo: number;
    rows: StandingRow[];
}

/** Why a draft cannot start yet. */
export type StartProblem = 'TOO_FEW_ENTRIES' | 'TEAM_SIZE' | 'GROUPS' | 'ADVANCE';

/**
 * A tournament being played (docs/01 §1.5c): the start that generates the
 * matches, results and what follows from them, the knockout out of the
 * groups, and the finish. The bracket and table logic is pure, in
 * `modules/tournaments/`; this persists it. Running it is the organiser's or
 * an admin's (`TournamentService.canManage`); a result is also its players'
 * while it has none (`canReport`). Both answer `FORBIDDEN` to anybody else.
 */
export class TournamentPlayService {
    /** Why a draft cannot start yet, or null: the draft screen shows the same. */
    static startProblem(tournament: Tournament): StartProblem | null {
        const { entries } = tournament;
        if (entries.length < TOURNAMENT.MIN_ENTRIES) return 'TOO_FEW_ENTRIES';
        const sized = entries.every((entry) =>
            tournament.participantMode === ParticipantMode.PLAYERS
                ? entry.members.length === 1
                : entry.members.length >= 1 && entry.members.length <= (tournament.teamSize ?? 0),
        );
        if (!sized) return 'TEAM_SIZE';
        if (tournament.format === TournamentFormat.GROUPS_KNOCKOUT) {
            const groupCount = tournament.groupCount ?? 0;
            const advance = tournament.advancePerGroup ?? 0;
            if (entries.some((entry) => entry.groupNo === null || entry.groupNo > groupCount)) {
                return 'GROUPS';
            }
            const sizes = Array.from(
                { length: groupCount },
                (_, index) => entries.filter((entry) => entry.groupNo === index + 1).length,
            );
            if (sizes.some((size) => size < 2)) return 'TOO_FEW_ENTRIES';
            if (advance > Math.min(...sizes) || groupCount * advance < 2) return 'ADVANCE';
        }
        return null;
    }

    /**
     * Generates the matches and opens play. A knockout gets its whole
     * bracket, byes already decided; a group stage gets every group's round
     * robin, and its knockout comes with `advance`.
     */
    static async start(
        tournament: Tournament,
        actor: GroupMember,
    ): Promise<TournamentResult<'FORBIDDEN' | 'NOT_DRAFT' | StartProblem>> {
        if (!TournamentService.canManage(tournament, actor)) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        if (tournament.status !== TournamentStatus.DRAFT) {
            return { ok: false, problem: 'NOT_DRAFT' };
        }
        const problem = TournamentPlayService.startProblem(tournament);
        if (problem !== null) return { ok: false, problem };

        const entries = TournamentService.bySeed(tournament.entries);
        const plans =
            tournament.format === TournamentFormat.KNOCKOUT
                ? knockoutPlan(
                      entries.map((entry) => ({ id: entry.id, group: null })),
                      tournament.thirdPlace,
                  )
                : Array.from({ length: tournament.groupCount ?? 0 }, (_, index) =>
                      roundRobinPlan(
                          index + 1,
                          entries
                              .filter((entry) => entry.groupNo === index + 1)
                              .map((entry) => entry.id),
                      ),
                  ).flat();

        await AppDataSource.transaction(async (manager) => {
            await TournamentPlayService.insertPlan(manager, tournament.id, plans);
            await manager.update(Tournament, tournament.id, {
                status: TournamentStatus.RUNNING,
                startedAt: DateTime.utc().toJSDate(),
            });
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /**
     * A result: either side's people while the match has none, the organiser
     * or an admin always. A knockout winner goes on to the next match, and a
     * semi-final's loser to the third-place match. A correction that changes
     * the winner is refused once the match it fed was played.
     */
    static async report(
        tournament: Tournament,
        match: TournamentMatch,
        actor: GroupMember,
        result: MatchResultInput,
    ): Promise<
        TournamentResult<
            'NOT_RUNNING' | 'NOT_READY' | 'DRAW_IN_KNOCKOUT' | 'FORBIDDEN' | 'LATER_PLAYED'
        >
    > {
        if (tournament.status !== TournamentStatus.RUNNING) {
            return { ok: false, problem: 'NOT_RUNNING' };
        }
        const { homeEntryId, awayEntryId } = match;
        if (homeEntryId === null || awayEntryId === null) {
            return { ok: false, problem: 'NOT_READY' };
        }
        const knockout = match.stage === MatchStage.KNOCKOUT;
        if (knockout && result.homeScore === result.awayScore) {
            return { ok: false, problem: 'DRAW_IN_KNOCKOUT' };
        }
        if (!TournamentPlayService.canReport(tournament, match, actor)) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        const winner =
            result.homeScore > result.awayScore
                ? homeEntryId
                : result.awayScore > result.homeScore
                  ? awayEntryId
                  : null;
        const loser = winner === null ? null : winner === homeEntryId ? awayEntryId : homeEntryId;
        if (
            knockout &&
            match.status === MatchStatus.PLAYED &&
            match.winnerEntryId !== winner &&
            TournamentPlayService.followUps(tournament, match).some(
                (later) => later.status === MatchStatus.PLAYED,
            )
        ) {
            return { ok: false, problem: 'LATER_PLAYED' };
        }

        await AppDataSource.transaction(async (manager) => {
            await manager.update(TournamentMatch, match.id, {
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                winnerEntryId: winner,
                status: MatchStatus.PLAYED,
                playedAt: DateTime.utc().toJSDate(),
                reportedById: actor.userId,
            });
            if (knockout) {
                await TournamentPlayService.carry(manager, tournament, match, winner, loser);
            }
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /** Takes a result back, with what it put into later matches, if none of those was played. */
    static async clearResult(
        tournament: Tournament,
        match: TournamentMatch,
        actor: GroupMember,
    ): Promise<TournamentResult<'FORBIDDEN' | 'NOT_RUNNING' | 'NOT_READY' | 'LATER_PLAYED'>> {
        if (!TournamentService.canManage(tournament, actor)) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        if (tournament.status !== TournamentStatus.RUNNING) {
            return { ok: false, problem: 'NOT_RUNNING' };
        }
        if (match.homeEntryId === null || match.awayEntryId === null) {
            return { ok: false, problem: 'NOT_READY' };
        }
        const knockout = match.stage === MatchStage.KNOCKOUT;
        if (
            knockout &&
            TournamentPlayService.followUps(tournament, match).some(
                (later) => later.status === MatchStatus.PLAYED,
            )
        ) {
            return { ok: false, problem: 'LATER_PLAYED' };
        }
        await AppDataSource.transaction(async (manager) => {
            await manager.update(TournamentMatch, match.id, {
                homeScore: null,
                awayScore: null,
                winnerEntryId: null,
                status: MatchStatus.PENDING,
                playedAt: null,
                reportedById: null,
            });
            if (knockout) await TournamentPlayService.carry(manager, tournament, match, null, null);
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /**
     * Out of the groups into the knockout: once every group match is played,
     * the top of each table goes through, winners seeded first (see
     * `qualifiers`), and the bracket is generated like a knockout's.
     */
    static async advance(
        tournament: Tournament,
        actor: GroupMember,
    ): Promise<
        TournamentResult<
            'FORBIDDEN' | 'NOT_GROUPS' | 'NOT_RUNNING' | 'ALREADY_ADVANCED' | 'GROUPS_UNFINISHED'
        >
    > {
        if (!TournamentService.canManage(tournament, actor)) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        if (tournament.format !== TournamentFormat.GROUPS_KNOCKOUT) {
            return { ok: false, problem: 'NOT_GROUPS' };
        }
        if (tournament.status !== TournamentStatus.RUNNING) {
            return { ok: false, problem: 'NOT_RUNNING' };
        }
        if (tournament.matches.some((match) => match.stage === MatchStage.KNOCKOUT)) {
            return { ok: false, problem: 'ALREADY_ADVANCED' };
        }
        if (
            tournament.matches.some(
                (match) => match.stage === MatchStage.GROUP && match.status !== MatchStatus.PLAYED,
            )
        ) {
            return { ok: false, problem: 'GROUPS_UNFINISHED' };
        }
        const entrants = qualifiers(
            TournamentPlayService.groupTables(tournament),
            tournament.advancePerGroup ?? 1,
        );
        await AppDataSource.transaction(async (manager) => {
            await TournamentPlayService.insertPlan(
                manager,
                tournament.id,
                knockoutPlan(entrants, tournament.thirdPlace),
            );
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /** The final is played: its winner wins, and the tournament goes to the archive. */
    static async finish(
        tournament: Tournament,
        actor: GroupMember,
    ): Promise<TournamentResult<'FORBIDDEN' | 'NOT_RUNNING' | 'FINAL_UNPLAYED'>> {
        if (!TournamentService.canManage(tournament, actor)) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        if (tournament.status !== TournamentStatus.RUNNING) {
            return { ok: false, problem: 'NOT_RUNNING' };
        }
        const final = TournamentPlayService.final(tournament);
        if (final?.status !== MatchStatus.PLAYED || final.winnerEntryId === null) {
            return { ok: false, problem: 'FINAL_UNPLAYED' };
        }
        await Tournament.update(tournament.id, {
            status: TournamentStatus.FINISHED,
            winnerEntryId: final.winnerEntryId,
            finishedAt: DateTime.utc().toJSDate(),
        });
        return { ok: true, tournament: await TournamentService.reload(tournament.id) };
    }

    /**
     * Whether this person may enter this match's result now: the organiser
     * or an admin always, either side's people while there is none yet.
     */
    static canReport(tournament: Tournament, match: TournamentMatch, viewer: GroupMember): boolean {
        if (tournament.status !== TournamentStatus.RUNNING) return false;
        if (match.homeEntryId === null || match.awayEntryId === null) return false;
        if (TournamentService.canManage(tournament, viewer)) return true;
        const sides = new Set([match.homeEntryId, match.awayEntryId]);
        const plays = tournament.entries.some(
            (entry) =>
                sides.has(entry.id) &&
                entry.members.some((member) => member.userId === viewer.userId),
        );
        return plays && match.status === MatchStatus.PENDING;
    }

    static canAdvance(tournament: Tournament): boolean {
        const groupMatches = tournament.matches.filter((match) => match.stage === MatchStage.GROUP);
        return (
            tournament.format === TournamentFormat.GROUPS_KNOCKOUT &&
            tournament.status === TournamentStatus.RUNNING &&
            groupMatches.length > 0 &&
            groupMatches.every((match) => match.status === MatchStatus.PLAYED) &&
            !tournament.matches.some((match) => match.stage === MatchStage.KNOCKOUT)
        );
    }

    static canFinish(tournament: Tournament): boolean {
        return (
            tournament.status === TournamentStatus.RUNNING &&
            TournamentPlayService.final(tournament)?.status === MatchStatus.PLAYED
        );
    }

    /** Every group's table from its played matches, groups in order. Empty for a knockout. */
    static groupTables(tournament: Tournament): GroupTable[] {
        if (tournament.format !== TournamentFormat.GROUPS_KNOCKOUT) return [];
        return Array.from({ length: tournament.groupCount ?? 0 }, (_, index) => {
            const groupNo = index + 1;
            return {
                groupNo,
                rows: standings(
                    tournament.entries
                        .filter((entry) => entry.groupNo === groupNo)
                        .map((entry) => ({ id: entry.id, seed: entry.seed })),
                    tournament.matches.flatMap((match) =>
                        match.stage === MatchStage.GROUP &&
                        match.groupNo === groupNo &&
                        match.status === MatchStatus.PLAYED &&
                        match.homeEntryId !== null &&
                        match.awayEntryId !== null &&
                        match.homeScore !== null &&
                        match.awayScore !== null
                            ? [
                                  {
                                      homeId: match.homeEntryId,
                                      awayId: match.awayEntryId,
                                      homeScore: match.homeScore,
                                      awayScore: match.awayScore,
                                  },
                              ]
                            : [],
                    ),
                    { win: tournament.winPoints, draw: tournament.drawPoints },
                ),
            };
        });
    }

    /** The knockout's last round, position 0; none before a group stage advances. */
    private static final(tournament: Tournament): TournamentMatch | undefined {
        const knockout = tournament.matches.filter((match) => match.stage === MatchStage.KNOCKOUT);
        const lastRound = Math.max(0, ...knockout.map((match) => match.round));
        return knockout.find((match) => match.round === lastRound && match.position === 0);
    }

    /** The third-place match, when this is a semi-final and there is one. */
    private static thirdPlaceFor(
        tournament: Tournament,
        match: TournamentMatch,
    ): TournamentMatch | undefined {
        const final = TournamentPlayService.final(tournament);
        if (final === undefined || match.round !== final.round - 1) return undefined;
        return tournament.matches.find(
            (candidate) =>
                candidate.stage === MatchStage.KNOCKOUT &&
                candidate.round === final.round &&
                candidate.position === 1,
        );
    }

    /** The matches a knockout result feeds: the next one, and the third-place match from a semi. */
    private static followUps(tournament: Tournament, match: TournamentMatch): TournamentMatch[] {
        const next = tournament.matches.find((candidate) => candidate.id === match.nextMatchId);
        const third = TournamentPlayService.thirdPlaceFor(tournament, match);
        return [next, third].filter((later): later is TournamentMatch => later !== undefined);
    }

    /** Puts a knockout match's winner and loser where they go next; nulls take them out again. */
    private static async carry(
        manager: EntityManager,
        tournament: Tournament,
        match: TournamentMatch,
        winner: string | null,
        loser: string | null,
    ): Promise<void> {
        if (match.nextMatchId !== null && match.nextSlot !== null) {
            await manager.update(
                TournamentMatch,
                match.nextMatchId,
                match.nextSlot === MatchSlot.HOME
                    ? { homeEntryId: winner }
                    : { awayEntryId: winner },
            );
        }
        const third = TournamentPlayService.thirdPlaceFor(tournament, match);
        if (third !== undefined) {
            await manager.update(
                TournamentMatch,
                third.id,
                thirdPlaceSlot(match.position) === MatchSlot.HOME
                    ? { homeEntryId: loser }
                    : { awayEntryId: loser },
            );
        }
    }

    /**
     * Writes a plan as rows. Ids are made up front so every match can point at
     * the one its winner goes to, and the later rounds go in first, so that
     * match exists when the one pointing at it arrives.
     */
    private static async insertPlan(
        manager: EntityManager,
        tournamentId: string,
        plans: PlannedMatch[],
    ): Promise<void> {
        const key = (
            plan: { round: number; position: number },
            stage: MatchStage,
            group: number | null,
        ) => `${stage}:${String(group ?? 0)}:${String(plan.round)}:${String(plan.position)}`;
        const ids = new Map(
            plans.map((plan) => [key(plan, plan.stage, plan.groupNo), randomUUID()]),
        );
        const rows = [...plans]
            .sort((a, b) => b.round - a.round)
            .map((plan) => ({
                id: ids.get(key(plan, plan.stage, plan.groupNo)),
                tournamentId,
                stage: plan.stage,
                groupNo: plan.groupNo,
                round: plan.round,
                position: plan.position,
                homeEntryId: plan.homeId,
                awayEntryId: plan.awayId,
                homeScore: null,
                awayScore: null,
                winnerEntryId: plan.winnerId,
                status: plan.winnerId === null ? MatchStatus.PENDING : MatchStatus.PLAYED,
                nextMatchId:
                    plan.next === null
                        ? null
                        : (ids.get(key(plan.next, plan.stage, plan.groupNo)) ?? null),
                nextSlot: plan.next?.slot ?? null,
                reportedById: null,
                playedAt: null,
            }));
        if (rows.length > 0) await manager.insert(TournamentMatch, rows);
    }
}
