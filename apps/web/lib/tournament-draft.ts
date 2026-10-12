import { ParticipantMode, TOURNAMENT } from '@bzim/types';
import type { TournamentDetailDto, TournamentEntryDto, TournamentEntryPatch } from '@bzim/types';

/** The entries in the order of the draw, top seed first. */
export function bySeed(entries: readonly TournamentEntryDto[]): TournamentEntryDto[] {
    return [...entries].sort((a, b) => a.seed - b.seed);
}

export interface DraftGroup {
    groupNo: number;
    entries: TournamentEntryDto[];
}

/** A group stage's groups in order, each with its entries by seed; an empty group is still there to drop into. */
export function draftGroups(
    tournament: Pick<TournamentDetailDto, 'groupCount' | 'entries'>,
): DraftGroup[] {
    return Array.from({ length: tournament.groupCount ?? 0 }, (_, index) => ({
        groupNo: index + 1,
        entries: bySeed(tournament.entries.filter((entry) => entry.groupNo === index + 1)),
    }));
}

/** Who plays already. Nobody plays in two entries, so the pickers offer only the rest. */
export function playingUserIds(entries: readonly TournamentEntryDto[]): Set<string> {
    return new Set(
        entries.flatMap((entry) =>
            entry.members.flatMap((member) => (member.user === null ? [] : [member.user.id])),
        ),
    );
}

/** How many teams random teams make: as many as the team size needs, as the API deals them. */
export function randomTeamCount(people: number, teamSize: number): number {
    return Math.ceil(people / Math.max(teamSize, 1));
}

/** Random teams need a team tournament and people for two teams at least (else `TOO_FEW_PEOPLE`). */
export function canDealTeams(
    tournament: Pick<TournamentDetailDto, 'participantMode' | 'teamSize' | 'entries'>,
): boolean {
    const people = tournament.entries.reduce((sum, entry) => sum + entry.members.length, 0);
    return (
        tournament.participantMode === ParticipantMode.TEAMS &&
        randomTeamCount(people, tournament.teamSize ?? 1) >= 2
    );
}

/**
 * Sent to a group rather than swapped with an entry in it: how an entry gets
 * into an emptier group. Null when it is in that group already.
 */
export function groupPatch(
    dragged: TournamentEntryDto,
    groupNo: number,
): TournamentEntryPatch | null {
    return dragged.groupNo === groupNo ? null : { groupNo };
}

/** A team's name when none is typed: its people, joined, as the API names it. */
export function teamNameFor(names: readonly string[]): string {
    return names.join(' & ').slice(0, TOURNAMENT.ENTRY_NAME_MAX_LENGTH);
}
