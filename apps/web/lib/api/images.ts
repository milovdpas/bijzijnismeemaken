import { API_ENDPOINTS } from '@bzim/types';
import type { ImageSearchResponse, ImageUsedRequest } from '@bzim/types';

import { request } from './client';

export function searchImages(q: string, page: number): Promise<ImageSearchResponse> {
    return request<ImageSearchResponse>(API_ENDPOINTS.IMAGES.SEARCH, { query: { q, page } });
}

/** Tells the provider a photo was picked; fire and forget on the caller's side. */
export function markImageUsed(useToken: string): Promise<void> {
    const body: ImageUsedRequest = { useToken };
    return request<void>(API_ENDPOINTS.IMAGES.USED, { method: 'POST', body });
}
