import { API_ENDPOINTS } from '@bzim/types';
import type {
    CalendarConnectionDto,
    CalendarEventDto,
    CalendarIgnoreRuleDto,
    CalendarIgnoreRuleInput,
    CalendarSourceDto,
} from '@bzim/types';

import { API_URL } from '@/lib/site';
import { request } from './client';

/** Where the browser goes to connect: the API starts the provider's OAuth and redirects back to settings. */
export function calendarConnectUrl(scope: 'read' | 'readwrite', returnTo?: string): string {
    const query = new URLSearchParams({ scope, ...(returnTo === undefined ? {} : { returnTo }) });
    return `${API_URL}${API_ENDPOINTS.ME.CALENDAR_CONNECT}?${query.toString()}`;
}

export function fetchCalendar(): Promise<CalendarConnectionDto | null> {
    return request<CalendarConnectionDto | null>(API_ENDPOINTS.ME.CALENDAR);
}

export function disconnectCalendar(): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.CALENDAR, { method: 'DELETE' });
}

export function updateCalendarSource(
    sourceId: string,
    enabled: boolean,
): Promise<CalendarSourceDto> {
    return request<CalendarSourceDto>(API_ENDPOINTS.ME.CALENDAR_SOURCE(sourceId), {
        method: 'PATCH',
        body: { enabled },
    });
}

export function syncCalendar(): Promise<CalendarConnectionDto> {
    return request<CalendarConnectionDto>(API_ENDPOINTS.ME.CALENDAR_SYNC, { method: 'POST' });
}

export function fetchCalendarEvents(from: string, to: string): Promise<CalendarEventDto[]> {
    return request<CalendarEventDto[]>(API_ENDPOINTS.ME.CALENDAR_EVENTS, { query: { from, to } });
}

export function fetchIgnoreRules(): Promise<CalendarIgnoreRuleDto[]> {
    return request<CalendarIgnoreRuleDto[]>(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES);
}

export function addIgnoreRule(input: CalendarIgnoreRuleInput): Promise<CalendarIgnoreRuleDto> {
    return request<CalendarIgnoreRuleDto>(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES, {
        method: 'POST',
        body: input,
    });
}

export function removeIgnoreRule(ruleId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULE(ruleId), { method: 'DELETE' });
}
