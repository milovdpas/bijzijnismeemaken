import { API_ENDPOINTS } from '@bzim/types';
import type { GroupWidgetDto, WidgetConfig, WidgetSpec } from '@bzim/types';

import { request } from './client';

export function fetchWidgets(groupId: string): Promise<GroupWidgetDto[]> {
    return request<GroupWidgetDto[]>(API_ENDPOINTS.WIDGETS.LIST(groupId));
}

export function addWidget(groupId: string, spec: WidgetSpec): Promise<GroupWidgetDto> {
    return request<GroupWidgetDto>(API_ENDPOINTS.WIDGETS.CREATE(groupId), {
        method: 'POST',
        body: spec,
    });
}

export function updateWidget(
    groupId: string,
    widgetId: string,
    config: WidgetConfig,
): Promise<GroupWidgetDto> {
    return request<GroupWidgetDto>(API_ENDPOINTS.WIDGETS.DETAIL(groupId, widgetId), {
        method: 'PATCH',
        body: { config },
    });
}

export function removeWidget(groupId: string, widgetId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.WIDGETS.DETAIL(groupId, widgetId), { method: 'DELETE' });
}

export function reorderWidgets(groupId: string, widgetIds: string[]): Promise<GroupWidgetDto[]> {
    return request<GroupWidgetDto[]>(API_ENDPOINTS.WIDGETS.ORDER(groupId), {
        method: 'PUT',
        body: { widgetIds },
    });
}

export function restoreDefaultWidgets(groupId: string): Promise<GroupWidgetDto[]> {
    return request<GroupWidgetDto[]>(API_ENDPOINTS.WIDGETS.RESTORE_DEFAULTS(groupId), {
        method: 'POST',
    });
}
