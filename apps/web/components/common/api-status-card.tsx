'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchHealth } from '@/lib/api/health';
import { queryKeys } from '@/lib/query-keys';

/**
 * Shows whether the API answers. A skeleton-phase component: it proves the
 * query provider, the API client and i18n work together, and it goes away once
 * the groups list replaces it in task 15.
 */
export function ApiStatusCard() {
    const { t } = useTranslation();
    const health = useQuery({ queryKey: queryKeys.health, queryFn: fetchHealth });

    const status = health.isPending
        ? t('status.checking')
        : health.isError
          ? t('status.unreachable')
          : health.data.database
            ? t('status.ok')
            : t('status.degraded');

    return (
        <Card className="gap-0 p-4">
            <CardHeader className="p-0">
                <CardTitle className="text-sm font-semibold">{t('status.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 text-sm text-muted-foreground">{status}</CardContent>
        </Card>
    );
}
