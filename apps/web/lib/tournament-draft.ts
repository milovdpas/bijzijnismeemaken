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
 * Where an entry goes when it is dropped on another: that entry's seed, and
 * in a group stage its group too. The API moves it there and shifts the
 * rest, so it lands before an entry dropped on from below and after one
 * dropped on from above, as a list reorders.
 */
export function dropPatch(
    dragged: TournamentEntryDto,
    target: TournamentEntryDto,
): TournamentEntryPatch | null {
    if (dragged.id === target.id) return null;
    return target.groupNo !== null && target.groupNo !== dragged.groupNo
        ? { seed: target.seed, groupNo: target.groupNo }
        : { seed: target.seed };
}

/** Dropped on a group rather than on an entry in it, as an empty group only can be. */
export function groupPatch(
    dragged: TournamentEntryDto,
    groupNo: number,
): TournamentEntryPatch | null {
    return dragged.groupNo === groupNo ? null : { groupNo };
}

/**
 * One step up or down within a list (the whole draw, or one group): the
 * neighbour's seed, which swaps the two, whatever other groups hold in
 * between. Null at either end.
 */
export function stepPatch(
    list: readonly TournamentEntryDto[],
    entryId: string,
    step: -1 | 1,
): TournamentEntryPatch | null {
    const index = list.findIndex((entry) => entry.id === entryId);
    const neighbour = index === -1 ? undefined : list[index + step];
    return neighbour === undefined ? null : { seed: neighbour.seed };
}

/** A team's name when none is typed: its people, joined, as the API names it. */
export function teamNameFor(names: readonly string[]): string {
    return names.join(' & ').slice(0, TOURNAMENT.ENTRY_NAME_MAX_LENGTH);
}
