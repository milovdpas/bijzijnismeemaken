import { API_ENDPOINTS } from '@bzim/types';
import type {
    MatchResultInput,
    TournamentDetailDto,
    TournamentEntryInput,
    TournamentEntryPatch,
    TournamentInput,
    TournamentListingDto,
    TournamentSettings,
    TournamentStatus,
} from '@bzim/types';

import { request } from './client';

/** Without a status: running, then drafts. `finished` is the archive; an activity's are any status. */
export interface TournamentsQuery {
    status?: TournamentStatus;
    activityId?: string;
}

export function fetchTournaments(
    groupId: string,
    query: TournamentsQuery = {},
): Promise<TournamentListingDto[]> {
    return request<TournamentListingDto[]>(API_ENDPOINTS.TOURNAMENTS.LIST(groupId), {
        query: { status: query.status, activityId: query.activityId },
    });
}

export function fetchTournament(
    groupId: string,
    tournamentId: string,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.DETAIL(groupId, tournamentId));
}

export function createTournament(
    groupId: string,
    input: TournamentInput,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.CREATE(groupId), {
        method: 'POST',
        body: input,
    });
}

/** Name and description any time; the rest only while a draft. */
export function updateTournament(
    groupId: string,
    tournamentId: string,
    patch: Partial<TournamentSettings>,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.DETAIL(groupId, tournamentId), {
        method: 'PATCH',
        body: patch,
    });
}

export function deleteTournament(groupId: string, tournamentId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.TOURNAMENTS.DETAIL(groupId, tournamentId), {
        method: 'DELETE',
    });
}

export function addTournamentEntry(
    groupId: string,
    tournamentId: string,
    input: TournamentEntryInput,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.ENTRIES(groupId, tournamentId), {
        method: 'POST',
        body: input,
    });
}

export function updateTournamentEntry(
    groupId: string,
    tournamentId: string,
    entryId: string,
    patch: TournamentEntryPatch,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(
        API_ENDPOINTS.TOURNAMENTS.ENTRY(groupId, tournamentId, entryId),
        { method: 'PATCH', body: patch },
    );
}

export function removeTournamentEntry(
    groupId: string,
    tournamentId: string,
    entryId: string,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(
        API_ENDPOINTS.TOURNAMENTS.ENTRY(groupId, tournamentId, entryId),
        { method: 'DELETE' },
    );
}

/** Shuffles the seeds and deals the groups again; with `teams`, first deals the people into random teams. */
export function drawTournament(
    groupId: string,
    tournamentId: string,
    teams: boolean,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.DRAW(groupId, tournamentId), {
        method: 'POST',
        body: { teams },
    });
}

export function startTournament(
    groupId: string,
    tournamentId: string,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.START(groupId, tournamentId), {
        method: 'POST',
    });
}

export function reportResult(
    groupId: string,
    tournamentId: string,
    matchId: string,
    result: MatchResultInput,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(
        API_ENDPOINTS.TOURNAMENTS.RESULT(groupId, tournamentId, matchId),
        { method: 'PUT', body: result },
    );
}

export function clearResult(
    groupId: string,
    tournamentId: string,
    matchId: string,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(
        API_ENDPOINTS.TOURNAMENTS.RESULT(groupId, tournamentId, matchId),
        { method: 'DELETE' },
    );
}

export function advanceTournament(
    groupId: string,
    tournamentId: string,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.ADVANCE(groupId, tournamentId), {
        method: 'POST',
    });
}

export function finishTournament(
    groupId: string,
    tournamentId: string,
): Promise<TournamentDetailDto> {
    return request<TournamentDetailDto>(API_ENDPOINTS.TOURNAMENTS.FINISH(groupId, tournamentId), {
        method: 'POST',
    });
}
