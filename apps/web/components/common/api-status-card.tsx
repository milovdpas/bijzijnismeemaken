'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchHealth } from '@/lib/api/health';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/**
 * Shows whether the API answers. Lives in settings as a small diagnostic, and
 * doubles as the first consumer of the query provider and the API client.
 */
export function ApiStatusCard() {
    const { t } = useTranslation();
    const health = useQuery({ queryKey: queryKeys.health, queryFn: fetchHealth });

    const state = health.isPending
        ? 'checking'
        : health.isError
          ? 'unreachable'
          : health.data.database
            ? 'ok'
            : 'degraded';

    const dot = {
        checking: 'bg-unknown',
        ok: 'bg-free',
        degraded: 'bg-brand',
        unreachable: 'bg-busy',
    }[state];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('status.title')}</CardTitle>
                <CardDescription>{t('status.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm">
                <span className={cn('size-2.5 shrink-0 rounded-full', dot)} aria-hidden />
                {t(`status.${state}`)}
            </CardContent>
        </Card>
    );
}
