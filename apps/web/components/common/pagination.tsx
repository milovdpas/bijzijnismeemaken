'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Previous / next around the page number. The API answers with `hasMore`
 * rather than a page count, so that is all this needs to know.
 */
export function Pagination({
    page,
    hasMore,
    onPageChange,
    className,
}: {
    page: number;
    hasMore: boolean;
    onPageChange: (page: number) => void;
    className?: string;
}) {
    const { t } = useTranslation();

    if (page === 1 && !hasMore) return null;

    return (
        <nav className={cn('flex items-center justify-center gap-3', className)}>
            <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                aria-label={t('pagination.previous')}
            >
                <ChevronLeft />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
                {t('pagination.page', { page })}
            </span>
            <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => onPageChange(page + 1)}
                aria-label={t('pagination.next')}
            >
                <ChevronRight />
            </Button>
        </nav>
    );
}
