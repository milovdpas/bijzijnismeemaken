import { API_ENDPOINTS } from '@bzim/types';
import type {
    AddLeaderboardMemberRequest,
    LeaderboardDetailDto,
    LeaderboardInput,
    LeaderboardListingDto,
    LeaderboardMemberDto,
    LeaderboardPeriod,
    Paginated,
    PeriodsResponse,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';

import { request } from './client';

export function fetchLeaderboards(groupId: string): Promise<LeaderboardListingDto[]> {
    return request<LeaderboardListingDto[]>(API_ENDPOINTS.LEADERBOARDS.LIST(groupId));
}

export function fetchLeaderboard(
    groupId: string,
    leaderboardId: string,
): Promise<LeaderboardDetailDto> {
    return request<LeaderboardDetailDto>(API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, leaderboardId));
}

export function createLeaderboard(
    groupId: string,
    input: LeaderboardInput,
): Promise<LeaderboardDetailDto> {
    return request<LeaderboardDetailDto>(API_ENDPOINTS.LEADERBOARDS.CREATE(groupId), {
        method: 'POST',
        body: input,
    });
}

export function updateLeaderboard(
    groupId: string,
    leaderboardId: string,
    patch: Partial<LeaderboardInput>,
): Promise<LeaderboardDetailDto> {
    return request<LeaderboardDetailDto>(
        API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, leaderboardId),
        { method: 'PATCH', body: patch },
    );
}

export function deleteLeaderboard(groupId: string, leaderboardId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, leaderboardId), {
        method: 'DELETE',
    });
}

/** A group member by id, or a guest by name. */
export function addLeaderboardMember(
    groupId: string,
    leaderboardId: string,
    who: AddLeaderboardMemberRequest,
): Promise<LeaderboardMemberDto> {
    return request<LeaderboardMemberDto>(
        API_ENDPOINTS.LEADERBOARDS.MEMBERS(groupId, leaderboardId),
        { method: 'POST', body: who },
    );
}

export function removeLeaderboardMember(
    groupId: string,
    leaderboardId: string,
    memberId: string,
): Promise<void> {
    return request<void>(API_ENDPOINTS.LEADERBOARDS.MEMBER(groupId, leaderboardId, memberId), {
        method: 'DELETE',
    });
}

export interface ScoresQuery {
    period: LeaderboardPeriod;
    year?: number;
    month?: number;
    page: number;
    pageSize: number;
}

export function fetchScores(
    groupId: string,
    leaderboardId: string,
    query: ScoresQuery,
): Promise<ScoresResponse> {
    return request<ScoresResponse>(API_ENDPOINTS.LEADERBOARDS.SCORES(groupId, leaderboardId), {
        query: {
            period: query.period,
            year: query.year,
            month: query.month,
            page: query.page,
            pageSize: query.pageSize,
        },
    });
}

export function fetchPeriods(groupId: string, leaderboardId: string): Promise<PeriodsResponse> {
    return request<PeriodsResponse>(API_ENDPOINTS.LEADERBOARDS.PERIODS(groupId, leaderboardId));
}

export function fetchHistory(
    groupId: string,
    leaderboardId: string,
    page: number,
    pageSize: number,
): Promise<Paginated<ScoreHistoryDto>> {
    return request<Paginated<ScoreHistoryDto>>(
        API_ENDPOINTS.LEADERBOARDS.HISTORY(groupId, leaderboardId),
        { query: { page, pageSize } },
    );
}

/** An absolute value for the current period; `null` clears it. */
export function setScore(
    groupId: string,
    leaderboardId: string,
    memberId: string,
    score: number | null,
): Promise<void> {
    const url = API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(groupId, leaderboardId, memberId);
    return score === null
        ? request<void>(url, { method: 'DELETE' })
        : request<void>(url, { method: 'PUT', body: { score } });
}
