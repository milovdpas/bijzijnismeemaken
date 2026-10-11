import { MatchStage } from '@bzim/types';
import type {
    TournamentDetailDto,
    TournamentEntryDto,
    TournamentGroupDto,
    TournamentListingDto,
    TournamentMatchDto,
} from '@bzim/types';

import type Tournament from '../models/Tournament.entity';
import type TournamentEntry from '../models/TournamentEntry.entity';
import type TournamentMatch from '../models/TournamentMatch.entity';
import type { StandingRow } from '../modules/tournaments/standings';

/** What the services worked out for the viewer; the presenter only lays it out. */
export interface TournamentView {
    viewerId: string;
    canManage: boolean;
    startProblem: string | null;
    canAdvance: boolean;
    canFinish: boolean;
    groups: { groupNo: number; rows: StandingRow[] }[];
    canReport: (match: TournamentMatch) => boolean;
}

/**
 * A tournament for the list (needs `createdBy` and `entries`) and in full
 * (also `activity`, `entries.members.user` and `matches`).
 */
export default class TournamentPresenter {
    static listing(tournament: Tournament): TournamentListingDto {
        const organiser = tournament.createdBy?.toSummary() ?? null;
        return {
            id: tournament.id,
            groupId: tournament.groupId,
            name: tournament.name,
            format: tournament.format,
            participantMode: tournament.participantMode,
            status: tournament.status,
            entryCount: tournament.entries.length,
            winnerName:
                tournament.entries.find((entry) => entry.id === tournament.winnerEntryId)?.name ??
                null,
            activityId: tournament.activityId,
            organiserName: organiser?.displayName ?? tournament.creatorNameSnapshot,
            createdAt: tournament.createdAt.toISOString(),
            startedAt: tournament.startedAt?.toISOString() ?? null,
            finishedAt: tournament.finishedAt?.toISOString() ?? null,
        };
    }

    static detail(tournament: Tournament, view: TournamentView): TournamentDetailDto {
        const advance = tournament.advancePerGroup ?? 0;
        const groups: TournamentGroupDto[] = view.groups.map((group) => ({
            groupNo: group.groupNo,
            standings: group.rows.map((row) => ({ ...row, qualifies: row.rank <= advance })),
        }));
        return {
            ...TournamentPresenter.listing(tournament),
            description: tournament.description,
            teamSize: tournament.teamSize,
            winPoints: tournament.winPoints,
            drawPoints: tournament.drawPoints,
            groupCount: tournament.groupCount,
            advancePerGroup: tournament.advancePerGroup,
            thirdPlace: tournament.thirdPlace,
            organiser: tournament.createdBy?.toSummary() ?? null,
            activity:
                tournament.activity === null
                    ? null
                    : { id: tournament.activity.id, title: tournament.activity.title },
            winnerEntryId: tournament.winnerEntryId,
            canManage: view.canManage,
            myEntryIds: tournament.entries
                .filter((entry) => entry.members.some((member) => member.userId === view.viewerId))
                .map((entry) => entry.id),
            startProblem: view.startProblem,
            canAdvance: view.canAdvance,
            canFinish: view.canFinish,
            entries: [...tournament.entries]
                .sort((a, b) => a.seed - b.seed)
                .map((entry) => TournamentPresenter.entry(entry)),
            matches: [...tournament.matches]
                .sort(
                    (a, b) =>
                        Number(a.stage === MatchStage.KNOCKOUT) -
                            Number(b.stage === MatchStage.KNOCKOUT) ||
                        (a.groupNo ?? 0) - (b.groupNo ?? 0) ||
                        a.round - b.round ||
                        a.position - b.position,
                )
                .map((match) => TournamentPresenter.match(match, view.canReport(match))),
            groups,
        };
    }

    /**
     * The live name and avatar while the person is around, the snapshots for
     * a guest or a leaver. People by name: a team saved at once has no
     * order of its own.
     */
    private static entry(entry: TournamentEntry): TournamentEntryDto {
        return {
            id: entry.id,
            name: entry.name,
            seed: entry.seed,
            groupNo: entry.groupNo,
            members: entry.members
                .map((member) => {
                    const user = member.user?.toSummary() ?? null;
                    return {
                        id: member.id,
                        user,
                        displayName: user?.displayName ?? member.displayNameSnapshot,
                        avatarKey: user?.avatarKey ?? member.avatarKeySnapshot,
                    };
                })
                .sort((a, b) => a.displayName.localeCompare(b.displayName)),
        };
    }

    private static match(match: TournamentMatch, canReport: boolean): TournamentMatchDto {
        return {
            id: match.id,
            stage: match.stage,
            groupNo: match.groupNo,
            round: match.round,
            position: match.position,
            homeEntryId: match.homeEntryId,
            awayEntryId: match.awayEntryId,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            winnerEntryId: match.winnerEntryId,
            status: match.status,
            nextMatchId: match.nextMatchId,
            nextSlot: match.nextSlot,
            isBye:
                match.winnerEntryId !== null &&
                (match.homeEntryId === null || match.awayEntryId === null),
            playedAt: match.playedAt?.toISOString() ?? null,
            canReport,
        };
    }
}
