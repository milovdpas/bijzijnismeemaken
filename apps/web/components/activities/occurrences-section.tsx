'use client';

import { ERROR_CODES, OccurrenceStatus } from '@bzim/types';
import type { ActivityDetailDto, OccurrenceDto, OccurrenceInput } from '@bzim/types';
import { CalendarPlus, Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlanOccurrenceDialog } from '@/components/activities/plan-occurrence-dialog';
import { Avatar } from '@/components/common/avatar';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    useDeleteOccurrence,
    usePlanOccurrence,
    useUpdateOccurrence,
} from '@/hooks/queries/use-activities';
import { ApiError } from '@/lib/api/client';
import { errorKey } from '@/lib/api/errors';
import { awaitsConfirmation, describeOccurrence, todayIso } from '@/lib/occurrence-format';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<OccurrenceStatus, string> = {
    [OccurrenceStatus.PLANNED]: 'border-transparent bg-free/30 text-foreground',
    [OccurrenceStatus.DONE]: 'border-transparent bg-muted text-muted-foreground',
    [OccurrenceStatus.CANCELLED]: 'border-transparent bg-destructive/10 text-destructive',
};

/** The API's own reason for a refused plan, as the sentence the dialog shows for it. */
function planErrorKey(error: unknown): string {
    if (error instanceof ApiError) {
        const problem = (error.details as { problem?: string } | undefined)?.problem;
        if (
            (error.code === ERROR_CODES.VALIDATION_FAILED || error.code === ERROR_CODES.CONFLICT) &&
            problem !== undefined
        ) {
            return `planDialog.problems.${problem}`;
        }
    }
    return errorKey(error);
}

/**
 * When it happens: every occurrence newest first, with who counts for it.
 * Managers (creator, admins) plan new ones and re-date, finish, cancel or
 * remove existing ones; a planned one whose day has passed is flagged as
 * waiting for a verdict, because nothing closes it on its own.
 */
export function OccurrencesSection({
    groupId,
    activity,
    canManage,
}: {
    groupId: string;
    activity: ActivityDetailDto;
    canManage: boolean;
}) {
    const { t, i18n } = useTranslation();
    const plan = usePlanOccurrence(groupId, activity.id);
    const update = useUpdateOccurrence(groupId, activity.id);
    const remove = useDeleteOccurrence(groupId, activity.id);
    const [planning, setPlanning] = useState(false);
    const [editing, setEditing] = useState<OccurrenceDto | null>(null);
    const [removing, setRemoving] = useState<OccurrenceDto | null>(null);
    const today = todayIso();

    const describe = (occurrence: OccurrenceDto) =>
        describeOccurrence(
            occurrence.date,
            occurrence.daypart,
            occurrence.startTime,
            i18n.language,
            (daypart) => t(`dayparts.${daypart}`),
        );

    const submitPlan = (input: OccurrenceInput) =>
        plan.mutate(input, { onSuccess: () => setPlanning(false) });
    const submitEdit = (input: OccurrenceInput) => {
        if (editing === null) return;
        update.mutate(
            { occurrenceId: editing.id, patch: input },
            { onSuccess: () => setEditing(null) },
        );
    };
    const setStatus = (occurrence: OccurrenceDto, status: OccurrenceStatus) =>
        update.mutate({ occurrenceId: occurrence.id, patch: { status } });

    return (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base">{t('activityDetail.occurrencesTitle')}</h2>
                {canManage && (
                    <Button size="sm" onClick={() => setPlanning(true)}>
                        <CalendarPlus />
                        {t('activityDetail.plan')}
                    </Button>
                )}
            </div>

            {activity.occurrences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {canManage
                        ? t('activityDetail.notPlannedManager')
                        : t('activityDetail.notPlanned')}
                </p>
            ) : (
                <ul className="divide-y">
                    {activity.occurrences.map((occurrence) => {
                        const waiting =
                            occurrence.status === OccurrenceStatus.PLANNED &&
                            awaitsConfirmation(occurrence.date, today);
                        return (
                            <li key={occurrence.id} className="space-y-2 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold">
                                        {describe(occurrence)}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            STATUS_STYLE[occurrence.status],
                                            waiting && 'bg-brand/40',
                                        )}
                                    >
                                        {waiting
                                            ? t('activityDetail.awaiting')
                                            : t(`occurrenceStatus.${occurrence.status}`)}
                                    </Badge>
                                </div>
                                {occurrence.notes !== null && (
                                    <p className="text-sm text-muted-foreground">
                                        {occurrence.notes}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-1">
                                    {occurrence.participants.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                            {t('activityDetail.noParticipants')}
                                        </span>
                                    ) : (
                                        occurrence.participants.map((user) => (
                                            <span key={user.id} title={user.displayName}>
                                                <Avatar avatarKey={user.avatarKey} size="sm" />
                                            </span>
                                        ))
                                    )}
                                </div>
                                {canManage && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {occurrence.status === OccurrenceStatus.PLANNED && (
                                            <>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() => setEditing(occurrence)}
                                                >
                                                    <Pencil />
                                                    {t('activityDetail.redate')}
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    disabled={update.isPending}
                                                    onClick={() =>
                                                        setStatus(occurrence, OccurrenceStatus.DONE)
                                                    }
                                                >
                                                    <Check />
                                                    {t('activityDetail.markDone')}
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="destructive"
                                                    disabled={update.isPending}
                                                    onClick={() =>
                                                        setStatus(
                                                            occurrence,
                                                            OccurrenceStatus.CANCELLED,
                                                        )
                                                    }
                                                >
                                                    <X />
                                                    {t('activityDetail.cancelOccurrence')}
                                                </Button>
                                            </>
                                        )}
                                        {occurrence.status !== OccurrenceStatus.PLANNED && (
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                disabled={update.isPending}
                                                onClick={() =>
                                                    setStatus(occurrence, OccurrenceStatus.PLANNED)
                                                }
                                            >
                                                {t('activityDetail.reopen')}
                                            </Button>
                                        )}
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => setRemoving(occurrence)}
                                        >
                                            <Trash2 />
                                            {t('activityDetail.removeOccurrence')}
                                        </Button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {update.isError && (
                <FormMessage tone="error">{t(planErrorKey(update.error))}</FormMessage>
            )}

            {planning && (
                <PlanOccurrenceDialog
                    groupId={groupId}
                    activity={activity}
                    existing={null}
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setPlanning(false);
                            plan.reset();
                        }
                    }}
                    pending={plan.isPending}
                    error={plan.isError ? t(planErrorKey(plan.error)) : null}
                    onSubmit={submitPlan}
                />
            )}
            {editing !== null && (
                <PlanOccurrenceDialog
                    groupId={groupId}
                    activity={activity}
                    existing={editing}
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditing(null);
                            update.reset();
                        }
                    }}
                    pending={update.isPending}
                    error={update.isError ? t(planErrorKey(update.error)) : null}
                    onSubmit={submitEdit}
                />
            )}
            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null);
                }}
                title={t('activityDetail.removeOccurrence')}
                description={t('activityDetail.removeOccurrenceDescription')}
                confirmLabel={t('activityDetail.removeOccurrence')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() => {
                    if (removing !== null) {
                        remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
                    }
                }}
            />
        </section>
    );
}
