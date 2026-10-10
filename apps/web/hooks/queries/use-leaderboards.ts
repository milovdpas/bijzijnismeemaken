'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    AddLeaderboardMemberRequest,
    LeaderboardDetailDto,
    LeaderboardInput,
    LeaderboardListingDto,
    LeaderboardMemberDto,
    Paginated,
    PeriodsResponse,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';

import { ApiError } from '@/lib/api/client';
import {
    addLeaderboardMember,
    createLeaderboard,
    deleteLeaderboard,
    fetchLeaderboard,
    fetchHistory,
    fetchLeaderboards,
    fetchPeriods,
    fetchScores,
    removeLeaderboardMember,
    setScore,
    updateLeaderboard,
} from '@/lib/api/leaderboards';
import type { ScoresQuery } from '@/lib/api/leaderboards';
import { queryKeys } from '@/lib/query-keys';

function retryUnlessNotFound(count: number, error: Error): boolean {
    return !(error instanceof ApiError && error.status === 404) && count < 2;
}

export function useLeaderboards(groupId: string): UseQueryResult<LeaderboardListingDto[]> {
    return useQuery({
        queryKey: queryKeys.leaderboards.list(groupId),
        queryFn: () => fetchLeaderboards(groupId),
    });
}

/**
 * One board with its settings, members and editors. A 404 is an answer, not
 * a retry; an empty id (the "new" form) asks nothing, since the bare path
 * would be the list.
 */
export function useLeaderboard(
    groupId: string,
    leaderboardId: string,
): UseQueryResult<LeaderboardDetailDto> {
    return useQuery({
        queryKey: queryKeys.leaderboards.detail(groupId, leaderboardId),
        queryFn: () => fetchLeaderboard(groupId, leaderboardId),
        enabled: leaderboardId !== '',
        retry: retryUnlessNotFound,
    });
}

export function useCreateLeaderboard(
    groupId: string,
): UseMutationResult<LeaderboardDetailDto, Error, LeaderboardInput> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: LeaderboardInput) => createLeaderboard(groupId, input),
        onSuccess: (board) => {
            client.setQueryData(queryKeys.leaderboards.detail(groupId, board.id), board);
            void client.invalidateQueries({ queryKey: queryKeys.leaderboards.list(groupId) });
        },
    });
}

export function useUpdateLeaderboard(
    groupId: string,
    leaderboardId: string,
): UseMutationResult<LeaderboardDetailDto, Error, Partial<LeaderboardInput>> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (patch: Partial<LeaderboardInput>) =>
            updateLeaderboard(groupId, leaderboardId, patch),
        onSuccess: (board) => {
            client.setQueryData(queryKeys.leaderboards.detail(groupId, board.id), board);
            void client.invalidateQueries({ queryKey: queryKeys.leaderboards.list(groupId) });
        },
    });
}

export function useDeleteLeaderboard(groupId: string): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (leaderboardId: string) => deleteLeaderboard(groupId, leaderboardId),
        onSuccess: (_result, leaderboardId) => {
            client.removeQueries({
                queryKey: queryKeys.leaderboards.detail(groupId, leaderboardId),
            });
            void client.invalidateQueries({ queryKey: queryKeys.leaderboards.list(groupId) });
        },
    });
}

/** Adding or removing somebody changes the detail, the list's count and every ranking. */
function useMemberChange<TArgs, TResult>(
    groupId: string,
    leaderboardId: string,
    action: (args: TArgs) => Promise<TResult>,
): UseMutationResult<TResult, Error, TArgs> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => {
            void client.invalidateQueries({
                queryKey: queryKeys.leaderboards.one(groupId, leaderboardId),
            });
            void client.invalidateQueries({ queryKey: queryKeys.leaderboards.list(groupId) });
        },
    });
}

export function useAddLeaderboardMember(
    groupId: string,
    leaderboardId: string,
): UseMutationResult<LeaderboardMemberDto, Error, AddLeaderboardMemberRequest> {
    return useMemberChange(groupId, leaderboardId, (who: AddLeaderboardMemberRequest) =>
        addLeaderboardMember(groupId, leaderboardId, who),
    );
}

export function useRemoveLeaderboardMember(
    groupId: string,
    leaderboardId: string,
): UseMutationResult<void, Error, string> {
    return useMemberChange(groupId, leaderboardId, (memberId: string) =>
        removeLeaderboardMember(groupId, leaderboardId, memberId),
    );
}

/** One ranked page. The previous page stays on screen while the next loads. */
export function useScores(
    groupId: string,
    leaderboardId: string,
    query: ScoresQuery,
): UseQueryResult<ScoresResponse> {
    return useQuery({
        queryKey: queryKeys.leaderboards.scores(groupId, leaderboardId, JSON.stringify(query)),
        queryFn: () => fetchScores(groupId, leaderboardId, query),
        placeholderData: keepPreviousData,
    });
}

export function usePeriods(
    groupId: string,
    leaderboardId: string,
): UseQueryResult<PeriodsResponse> {
    return useQuery({
        queryKey: queryKeys.leaderboards.periods(groupId, leaderboardId),
        queryFn: () => fetchPeriods(groupId, leaderboardId),
    });
}

/** Setting or clearing (null) a score moves every ranking of the board and the card in the list. */
export function useSetScore(
    groupId: string,
    leaderboardId: string,
): UseMutationResult<void, Error, { memberId: string; score: number | null }> {
    return useMemberChange(groupId, leaderboardId, ({ memberId, score }) =>
        setScore(groupId, leaderboardId, memberId, score),
    );
}

/**
 * A first score for somebody not on the board yet: they are added, then
 * scored. Two requests; if the second fails they are on the board without
 * a score, which the players tab shows and the next try corrects.
 */
export function useScoreNewPlayer(
    groupId: string,
    leaderboardId: string,
): UseMutationResult<string, Error, { who: AddLeaderboardMemberRequest; score: number }> {
    return useMemberChange(groupId, leaderboardId, async ({ who, score }) => {
        const member = await addLeaderboardMember(groupId, leaderboardId, who);
        await setScore(groupId, leaderboardId, member.id, score);
        return member.id;
    });
}

/** One page of the board's history, newest first; the previous page stays while the next loads. */
export function useHistory(
    groupId: string,
    leaderboardId: string,
    page: number,
    pageSize: number,
): UseQueryResult<Paginated<ScoreHistoryDto>> {
    return useQuery({
        queryKey: queryKeys.leaderboards.history(groupId, leaderboardId, page),
        queryFn: () => fetchHistory(groupId, leaderboardId, page, pageSize),
        placeholderData: keepPreviousData,
    });
}
