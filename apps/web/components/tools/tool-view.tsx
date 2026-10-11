'use client';

import { ArrowLeft, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { useMounted } from '@/hooks/use-mounted';
import { findTool, toolHref, toolStorageKey } from '@/lib/tools';

/**
 * One tool, full width. It renders once mounted: its game comes out of this
 * device's storage, which the server never sees. Keyed on that storage, so
 * moving to another group's tool starts from that group's game.
 */
export function ToolView({ groupId, toolKey }: { groupId: string; toolKey: string }) {
    const { t } = useTranslation();
    const mounted = useMounted();
    const tool = findTool(toolKey);

    if (tool === undefined) {
        return (
            <EmptyState
                icon={Gamepad2}
                titleKey="tools.notFoundTitle"
                descriptionKey="tools.notFoundDescription"
                action={
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={toolHref(groupId)} />}
                    >
                        <ArrowLeft />
                        {t('tools.allTools')}
                    </Button>
                }
            />
        );
    }

    const { icon: Icon, component: Tool } = tool;
    const storageKey = toolStorageKey(groupId, tool.key);

    return (
        <div className="space-y-4">
            <Link
                href={toolHref(groupId)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                {t('tools.allTools')}
            </Link>
            <h2 className="flex items-center gap-2.5 text-xl">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                    <Icon className="size-4" />
                </span>
                {t(tool.labelKey)}
            </h2>
            {mounted ? (
                <Tool key={storageKey} groupId={groupId} storageKey={storageKey} />
            ) : (
                <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            )}
            <p className="pt-2 text-center text-xs text-muted-foreground">
                {t('tools.deviceNote')}
            </p>
        </div>
    );
}
