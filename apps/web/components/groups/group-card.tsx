'use client';

import type { GroupRole } from '@bzim/types';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * One group in a list. Whole card is the link when `href` is given (the
 * person's own groups); the public overview passes an `action` instead,
 * because there the thing to do is join, not open.
 */
export function GroupCard({
    name,
    description,
    memberCount,
    role,
    href,
    action,
    className,
}: {
    name: string;
    description: string | null;
    memberCount: number;
    role?: GroupRole;
    href?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();

    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 truncate text-lg">{name}</h2>
                {role !== undefined && role !== 'member' && (
                    <Badge variant="secondary" className="shrink-0">
                        {t(`role.${role}`)}
                    </Badge>
                )}
            </div>
            {description !== null && description !== '' && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="size-3.5" />
                    {t('groups.members', { count: memberCount })}
                </span>
                {action !== undefined && <span className="ml-auto">{action}</span>}
            </div>
        </>
    );

    const classes = cn('block rounded-2xl border bg-card p-4 shadow-sm', className);

    if (href !== undefined) {
        return (
            <Link href={href} className={cn(classes, 'transition-colors hover:border-ink/40')}>
                {body}
            </Link>
        );
    }
    return <article className={classes}>{body}</article>;
}
