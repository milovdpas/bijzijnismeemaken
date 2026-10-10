'use client';

import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';

/**
 * The card every widget sits in: an icon tile, a title, an optional action
 * on the right, and whatever the widget shows. In edit mode the dashboard
 * puts its own toolbar above through `toolbar`.
 */
export function WidgetFrame({
    icon: Icon,
    title,
    action,
    toolbar,
    children,
    className,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    action?: React.ReactNode;
    toolbar?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl border bg-card shadow-sm', className)}>
            {toolbar}
            <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="flex min-w-0 items-center gap-2 text-base">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                            <Icon className="size-4" />
                        </span>
                        <span className="truncate">{title}</span>
                    </h2>
                    {action}
                </div>
                {children}
            </div>
        </section>
    );
}
