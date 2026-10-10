'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { IMAGES } from '@bzim/types';
import type { ImageSearchResponse } from '@bzim/types';

import { searchImages } from '@/lib/api/images';
import { queryKeys } from '@/lib/query-keys';

/** Stock photo search. Off until the query is long enough; results are kept for a while since every call spends quota. */
export function useImageSearch(q: string, page: number): UseQueryResult<ImageSearchResponse> {
    return useQuery({
        queryKey: queryKeys.images.search(q, page),
        queryFn: () => searchImages(q, page),
        enabled: q.length >= IMAGES.QUERY_MIN_LENGTH,
        staleTime: 10 * 60_000,
        placeholderData: keepPreviousData,
        retry: false,
    });
}
