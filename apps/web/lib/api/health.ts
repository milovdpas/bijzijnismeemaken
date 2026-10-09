import { API_ENDPOINTS } from '@bzim/types';
import type { HealthResponse } from '@bzim/types';

import { request } from './client';

/**
 * The API's own health answer. 503 when the database is down, which `request`
 * turns into an `ApiError`; the status card treats that the same as "down".
 */
export function fetchHealth(): Promise<HealthResponse> {
    return request<HealthResponse>(API_ENDPOINTS.HEALTH);
}
