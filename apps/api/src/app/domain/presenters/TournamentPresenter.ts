import { MatchStage } from '@bzim/types';
import type { TournamentDetailDto, TournamentListingDto } from '@bzim/types';

import type Tournament from '../models/Tournament.entity';
import type TournamentMatch from '../models/TournamentMatch.entity';
import type { StandingRow } from '../tournaments/standings';

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
 * (also `activity`, `entries.members.user` and `matches`), composed from the
 * entities' own DTOs and what the viewer may do.
 */
export default class TournamentPresenter {
    static listing(tournament: Tournament): TournamentListingDto {
        return {
            ...tournament.toDto(),
            entryCount: tournament.entries.length,
            winnerName:
                tournament.entries.find((entry) => entry.id === tournament.winnerEntryId)?.name ??
                null,
        };
    }

    /** Entries by seed; matches group stage first, then by group, round and position. */
    static detail(tournament: Tournament, view: TournamentView): TournamentDetailDto {
        const advance = tournament.advancePerGroup ?? 0;
        return {
            ...TournamentPresenter.listing(tournament),
            activity:
                tournament.activity === null
                    ? null
                    : { id: tournament.activity.id, title: tournament.activity.title },
            canManage: view.canManage,
            myEntryIds: tournament.entries
                .filter((entry) => entry.members.some((member) => member.userId === view.viewerId))
                .map((entry) => entry.id),
            startProblem: view.startProblem,
            canAdvance: view.canAdvance,
            canFinish: view.canFinish,
            entries: [...tournament.entries]
                .sort((a, b) => a.seed - b.seed)
                .map((entry) => entry.toDto()),
            matches: [...tournament.matches]
                .sort(
                    (a, b) =>
                        Number(a.stage === MatchStage.KNOCKOUT) -
                            Number(b.stage === MatchStage.KNOCKOUT) ||
                        (a.groupNo ?? 0) - (b.groupNo ?? 0) ||
                        a.round - b.round ||
                        a.position - b.position,
                )
                .map((match) => ({ ...match.toDto(), canReport: view.canReport(match) })),
            groups: view.groups.map((group) => ({
                groupNo: group.groupNo,
                standings: group.rows.map((row) => ({ ...row, qualifies: row.rank <= advance })),
            })),
        };
    }
}
