'use client';

import { GroupRole, WidgetType } from '@bzim/types';
import type { GroupWidgetDto, WidgetSpec } from '@bzim/types';
import {
    Check,
    ChevronDown,
    ChevronUp,
    GripVertical,
    LayoutGrid,
    Pencil,
    Plus,
    RotateCcw,
    Settings2,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { AddWidgetSheet } from '@/components/dashboard/add-widget-sheet';
import { WidgetConfigDialog } from '@/components/dashboard/widget-config-dialog';
import {
    ActivityWidget,
    IdeasWidget,
    LeaderboardWidget,
    LinkWidget,
    NoteWidget,
    UpcomingWidget,
} from '@/components/dashboard/widgets';
import { Button } from '@/components/ui/button';
import { useGroup } from '@/hooks/queries/use-groups';
import {
    useAddWidget,
    useRemoveWidget,
    useReorderWidgets,
    useRestoreDefaultWidgets,
    useUpdateWidget,
    useWidgets,
} from '@/hooks/queries/use-widgets';
import { errorKey } from '@/lib/api/errors';
import { blankSpec, moveItem } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

/** The widget for a row, by its type. */
function Widget({
    groupId,
    widget,
    toolbar,
}: {
    groupId: string;
    widget: GroupWidgetDto;
    toolbar?: React.ReactNode;
}) {
    switch (widget.type) {
        case WidgetType.UPCOMING:
            return <UpcomingWidget groupId={groupId} config={widget.config} toolbar={toolbar} />;
        case WidgetType.IDEAS:
            return <IdeasWidget groupId={groupId} config={widget.config} toolbar={toolbar} />;
        case WidgetType.LEADERBOARD:
            return <LeaderboardWidget groupId={groupId} config={widget.config} toolbar={toolbar} />;
        case WidgetType.NOTE:
            return <NoteWidget groupId={groupId} config={widget.config} toolbar={toolbar} />;
        case WidgetType.ACTIVITY:
            return <ActivityWidget groupId={groupId} config={widget.config} toolbar={toolbar} />;
        case WidgetType.LINK:
            return <LinkWidget groupId={groupId} config={widget.config} toolbar={toolbar} />;
    }
}

/**
 * The group's front page: its widgets in order. Members see them; the
 * owner and admins switch to edit mode to add, configure, reorder (drag
 * on a desktop, the arrows on a phone) and remove them, or put the
 * defaults back.
 */
export function DashboardView({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const group = useGroup(groupId);
    const widgets = useWidgets(groupId);
    const add = useAddWidget(groupId);
    const update = useUpdateWidget(groupId);
    const remove = useRemoveWidget(groupId);
    const reorder = useReorderWidgets(groupId);
    const restore = useRestoreDefaultWidgets(groupId);

    const [editing, setEditing] = useState(false);
    const [picking, setPicking] = useState(false);
    const [adding, setAdding] = useState<WidgetSpec | null>(null);
    const [configuring, setConfiguring] = useState<GroupWidgetDto | null>(null);
    const [removing, setRemoving] = useState<GroupWidgetDto | null>(null);
    const [dragging, setDragging] = useState<number | null>(null);

    const role = group.data?.role;
    const isAdmin = role === GroupRole.OWNER || role === GroupRole.ADMIN;
    const list = widgets.data ?? [];

    const move = (from: number, to: number) => {
        const next = moveItem(list, from, to);
        if (next.some((widget, index) => widget.id !== list[index]?.id)) {
            reorder.mutate(next.map((widget) => widget.id));
        }
    };

    const toolbar = (widget: GroupWidgetDto, index: number) =>
        editing ? (
            <div className="flex items-center gap-1 rounded-t-2xl border-b bg-muted/60 px-2 py-1">
                <span
                    className="hidden cursor-grab touch-none text-muted-foreground md:flex"
                    aria-hidden
                >
                    <GripVertical className="size-4" />
                </span>
                <span className="flex md:hidden">
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={index === 0 || reorder.isPending}
                        aria-label={t('dashboard.moveUp')}
                        onClick={() => move(index, index - 1)}
                    >
                        <ChevronUp />
                    </Button>
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={index === list.length - 1 || reorder.isPending}
                        aria-label={t('dashboard.moveDown')}
                        onClick={() => move(index, index + 1)}
                    >
                        <ChevronDown />
                    </Button>
                </span>
                <span className="flex-1 truncate text-xs font-semibold text-muted-foreground">
                    {t(`widgets.${widget.type}.name`)}
                </span>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('dashboard.configure')}
                    onClick={() => setConfiguring(widget)}
                >
                    <Settings2 />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('dashboard.remove')}
                    onClick={() => setRemoving(widget)}
                >
                    <Trash2 />
                </Button>
            </div>
        ) : undefined;

    if (widgets.isError) {
        return <FormMessage tone="error">{t(errorKey(widgets.error))}</FormMessage>;
    }
    if (widgets.data === undefined) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="h-48 animate-pulse rounded-2xl bg-muted" />
                <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            </div>
        );
    }

    const actionError = [add, update, remove, reorder, restore].find((m) => m.isError)?.error;

    return (
        <div className="space-y-4">
            {isAdmin && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {editing && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={restore.isPending}
                                onClick={() => restore.mutate()}
                            >
                                <RotateCcw />
                                {t('dashboard.restoreDefaults')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
                                <Plus />
                                {t('dashboard.addWidget')}
                            </Button>
                        </>
                    )}
                    <Button
                        size="sm"
                        variant={editing ? 'default' : 'outline'}
                        onClick={() => setEditing((current) => !current)}
                    >
                        {editing ? <Check /> : <Pencil />}
                        {editing ? t('dashboard.done') : t('dashboard.edit')}
                    </Button>
                </div>
            )}
            {actionError !== undefined && !adding && configuring === null && removing === null && (
                <FormMessage tone="error">{t(errorKey(actionError))}</FormMessage>
            )}

            {list.length === 0 ? (
                <EmptyState
                    icon={LayoutGrid}
                    titleKey="dashboard.emptyTitle"
                    descriptionKey={isAdmin ? 'dashboard.emptyAdmin' : 'dashboard.emptyMember'}
                    action={
                        isAdmin ? (
                            <Button disabled={restore.isPending} onClick={() => restore.mutate()}>
                                <RotateCcw className="size-4" />
                                {t('dashboard.restoreDefaults')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className={cn('grid gap-4 md:grid-cols-2', reorder.isPending && 'opacity-80')}>
                    {list.map((widget, index) => (
                        <div
                            key={widget.id}
                            draggable={editing}
                            onDragStart={() => setDragging(index)}
                            onDragOver={(event) => {
                                if (dragging !== null) event.preventDefault();
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (dragging !== null) move(dragging, index);
                                setDragging(null);
                            }}
                            onDragEnd={() => setDragging(null)}
                            className={cn(
                                widget.type === WidgetType.NOTE && 'md:col-span-2',
                                dragging === index && 'opacity-50',
                            )}
                        >
                            <Widget
                                groupId={groupId}
                                widget={widget}
                                toolbar={toolbar(widget, index)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <AddWidgetSheet
                open={picking}
                onOpenChange={setPicking}
                onPick={(type) => {
                    setPicking(false);
                    setAdding(blankSpec(type));
                }}
            />
            {adding !== null && (
                <WidgetConfigDialog
                    key={adding.type}
                    groupId={groupId}
                    initial={adding}
                    open
                    onOpenChange={(open) => {
                        if (!open) setAdding(null);
                    }}
                    pending={add.isPending}
                    error={add.isError ? t(errorKey(add.error)) : null}
                    onSubmit={(spec) => add.mutate(spec, { onSuccess: () => setAdding(null) })}
                />
            )}
            {configuring !== null && (
                <WidgetConfigDialog
                    key={configuring.id}
                    groupId={groupId}
                    initial={{ type: configuring.type, config: configuring.config } as WidgetSpec}
                    open
                    onOpenChange={(open) => {
                        if (!open) setConfiguring(null);
                    }}
                    pending={update.isPending}
                    error={update.isError ? t(errorKey(update.error)) : null}
                    onSubmit={(spec) =>
                        update.mutate(
                            { widgetId: configuring.id, config: spec.config },
                            { onSuccess: () => setConfiguring(null) },
                        )
                    }
                />
            )}
            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null);
                }}
                title={t('dashboard.removeTitle')}
                description={t('dashboard.removeDescription')}
                confirmLabel={t('dashboard.remove')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() => {
                    if (removing !== null) {
                        remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
                    }
                }}
            />
        </div>
    );
}
