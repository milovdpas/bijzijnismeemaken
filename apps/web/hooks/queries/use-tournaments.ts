'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { TournamentStatus } from '@bzim/types';
import type {
    TournamentDetailDto,
    TournamentEntryInput,
    TournamentEntryPatch,
    TournamentInput,
    TournamentListingDto,
    TournamentSettings,
} from '@bzim/types';

import { ApiError } from '@/lib/api/client';
import {
    addTournamentEntry,
    createTournament,
    deleteTournament,
    drawTournament,
    fetchTournament,
    fetchTournaments,
    removeTournamentEntry,
    startTournament,
    updateTournament,
    updateTournamentEntry,
} from '@/lib/api/tournaments';
import { queryKeys } from '@/lib/query-keys';

function retryUnlessNotFound(count: number, error: Error): boolean {
    return !(error instanceof ApiError && error.status === 404) && count < 2;
}

/** The tab: what is on now (running, then drafts), or the archive of finished ones. */
export function useTournaments(
    groupId: string,
    archive: boolean,
): UseQueryResult<TournamentListingDto[]> {
    return useQuery({
        queryKey: queryKeys.tournaments.list(groupId, archive ? 'archive' : 'current'),
        queryFn: () =>
            fetchTournaments(groupId, archive ? { status: TournamentStatus.FINISHED } : {}),
    });
}

/**
 * One tournament with its entries, matches and tables. A 404 is an answer,
 * not a retry; an empty id (the "new" form) asks nothing.
 */
export function useTournament(
    groupId: string,
    tournamentId: string,
): UseQueryResult<TournamentDetailDto> {
    return useQuery({
        queryKey: queryKeys.tournaments.detail(groupId, tournamentId),
        queryFn: () => fetchTournament(groupId, tournamentId),
        enabled: tournamentId !== '',
        retry: retryUnlessNotFound,
    });
}

export function useCreateTournament(
    groupId: string,
): UseMutationResult<TournamentDetailDto, Error, TournamentInput> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: TournamentInput) => createTournament(groupId, input),
        onSuccess: (tournament) => {
            client.setQueryData(queryKeys.tournaments.detail(groupId, tournament.id), tournament);
            void client.invalidateQueries({ queryKey: queryKeys.tournaments.lists(groupId) });
        },
    });
}

export function useDeleteTournament(groupId: string): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (tournamentId: string) => deleteTournament(groupId, tournamentId),
        onSuccess: (_result, tournamentId) => {
            client.removeQueries({
                queryKey: queryKeys.tournaments.detail(groupId, tournamentId),
            });
            void client.invalidateQueries({ queryKey: queryKeys.tournaments.lists(groupId) });
        },
    });
}

/**
 * Every change to one tournament answers with the whole tournament as it now
 * is, so the detail is replaced from the answer and only the lists refetch
 * (their counts, statuses and winners follow from it).
 */
function useTournamentChange<TArgs>(
    groupId: string,
    action: (args: TArgs) => Promise<TournamentDetailDto>,
): UseMutationResult<TournamentDetailDto, Error, TArgs> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: (tournament) => {
            client.setQueryData(queryKeys.tournaments.detail(groupId, tournament.id), tournament);
            void client.invalidateQueries({ queryKey: queryKeys.tournaments.lists(groupId) });
        },
    });
}

export function useUpdateTournament(
    groupId: string,
    tournamentId: string,
): UseMutationResult<TournamentDetailDto, Error, Partial<TournamentSettings>> {
    return useTournamentChange(groupId, (patch: Partial<TournamentSettings>) =>
        updateTournament(groupId, tournamentId, patch),
    );
}

export function useAddEntry(
    groupId: string,
    tournamentId: string,
): UseMutationResult<TournamentDetailDto, Error, TournamentEntryInput> {
    return useTournamentChange(groupId, (input: TournamentEntryInput) =>
        addTournamentEntry(groupId, tournamentId, input),
    );
}

export function useUpdateEntry(
    groupId: string,
    tournamentId: string,
): UseMutationResult<TournamentDetailDto, Error, { entryId: string; patch: TournamentEntryPatch }> {
    return useTournamentChange(
        groupId,
        ({ entryId, patch }: { entryId: string; patch: TournamentEntryPatch }) =>
            updateTournamentEntry(groupId, tournamentId, entryId, patch),
    );
}

export function useRemoveEntry(
    groupId: string,
    tournamentId: string,
): UseMutationResult<TournamentDetailDto, Error, string> {
    return useTournamentChange(groupId, (entryId: string) =>
        removeTournamentEntry(groupId, tournamentId, entryId),
    );
}

/** The draw: `false` shuffles the seeds, `true` first deals everybody into random teams. */
export function useDrawTournament(
    groupId: string,
    tournamentId: string,
): UseMutationResult<TournamentDetailDto, Error, boolean> {
    return useTournamentChange(groupId, (teams: boolean) =>
        drawTournament(groupId, tournamentId, teams),
    );
}

export function useStartTournament(
    groupId: string,
    tournamentId: string,
): UseMutationResult<TournamentDetailDto, Error, void> {
    return useTournamentChange(groupId, () => startTournament(groupId, tournamentId));
}
