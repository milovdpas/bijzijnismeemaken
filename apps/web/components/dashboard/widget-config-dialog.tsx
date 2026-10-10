'use client';

import { WIDGETS, WidgetType } from '@bzim/types';
import type { WidgetSpec } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { PillGroup } from '@/components/common/pill-group';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useActivities } from '@/hooks/queries/use-activities';
import { useLeaderboards } from '@/hooks/queries/use-leaderboards';
import { widgetProblem } from '@/lib/dashboard';
import { enabledPeriods } from '@/lib/leaderboard-periods';

/** A number input that keeps a number in the spec; an emptied field reads as zero and fails the range. */
function NumberField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <Field label={label}>
            <Input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={Number.isNaN(value) ? '' : String(value)}
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </Field>
    );
}

/**
 * The settings of one widget, for adding and for changing alike. The
 * fields follow the type; Save is off for exactly the reasons the API
 * would refuse. The caller owns the request.
 */
export function WidgetConfigDialog({
    groupId,
    initial,
    open,
    onOpenChange,
    pending,
    error,
    onSubmit,
}: {
    groupId: string;
    initial: WidgetSpec;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pending: boolean;
    error: string | null;
    onSubmit: (spec: WidgetSpec) => void;
}) {
    const { t } = useTranslation();
    const [spec, setSpec] = useState<WidgetSpec>(initial);
    const [touched, setTouched] = useState(false);
    const leaderboards = useLeaderboards(groupId);
    const activities = useActivities(groupId, { sort: 'newest' });
    const problem = widgetProblem(spec);
    const canSave = problem === null && !pending;
    const patch = (next: WidgetSpec) => {
        setTouched(true);
        setSpec(next);
    };
    const problemText = touched && problem !== null ? t(`widgetForm.problems.${problem}`) : null;

    const fields = (() => {
        switch (spec.type) {
            case WidgetType.UPCOMING:
                return (
                    <NumberField
                        label={t('widgetForm.weeks')}
                        value={spec.config.weeks}
                        min={WIDGETS.UPCOMING_WEEKS_MIN}
                        max={WIDGETS.UPCOMING_WEEKS_MAX}
                        onChange={(weeks) => patch({ type: spec.type, config: { weeks } })}
                    />
                );
            case WidgetType.IDEAS:
                return (
                    <NumberField
                        label={t('widgetForm.limit')}
                        value={spec.config.limit}
                        min={WIDGETS.LIMIT_MIN}
                        max={WIDGETS.LIMIT_MAX}
                        onChange={(limit) => patch({ type: spec.type, config: { limit } })}
                    />
                );
            case WidgetType.LEADERBOARD: {
                const boards = leaderboards.data ?? [];
                const chosen = boards.find((board) => board.id === spec.config.leaderboardId);
                const periods = chosen === undefined ? [] : enabledPeriods(chosen);
                return (
                    <>
                        <Field label={t('widgetForm.leaderboard')}>
                            <Select
                                value={
                                    spec.config.leaderboardId === ''
                                        ? null
                                        : spec.config.leaderboardId
                                }
                                onValueChange={(value) => {
                                    if (value === null) return;
                                    const board = boards.find(
                                        (candidate) => candidate.id === value,
                                    );
                                    patch({
                                        type: spec.type,
                                        config: {
                                            ...spec.config,
                                            leaderboardId: value,
                                            period: board?.cardPeriod ?? spec.config.period,
                                        },
                                    });
                                }}
                                items={boards.map((board) => ({
                                    value: board.id,
                                    label: board.name,
                                }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('widgetForm.pickLeaderboard')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {boards.map((board) => (
                                        <SelectItem key={board.id} value={board.id}>
                                            {board.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        {periods.length > 1 && (
                            <Field label={t('widgetForm.period')}>
                                <PillGroup
                                    options={periods}
                                    value={spec.config.period}
                                    labelFor={(period) => t(`periods.${period}`)}
                                    onChange={(period) =>
                                        patch({
                                            type: spec.type,
                                            config: { ...spec.config, period },
                                        })
                                    }
                                />
                            </Field>
                        )}
                        <NumberField
                            label={t('widgetForm.limit')}
                            value={spec.config.limit}
                            min={WIDGETS.LIMIT_MIN}
                            max={WIDGETS.LIMIT_MAX}
                            onChange={(limit) =>
                                patch({ type: spec.type, config: { ...spec.config, limit } })
                            }
                        />
                    </>
                );
            }
            case WidgetType.NOTE:
                return (
                    <>
                        <Field label={t('widgetForm.noteTitle')}>
                            <Input
                                autoFocus
                                maxLength={WIDGETS.NOTE_TITLE_MAX_LENGTH}
                                value={spec.config.title}
                                onChange={(event) =>
                                    patch({
                                        type: spec.type,
                                        config: { ...spec.config, title: event.target.value },
                                    })
                                }
                            />
                        </Field>
                        <Field label={t('widgetForm.noteBody')}>
                            <Textarea
                                rows={4}
                                maxLength={WIDGETS.NOTE_BODY_MAX_LENGTH}
                                value={spec.config.body}
                                onChange={(event) =>
                                    patch({
                                        type: spec.type,
                                        config: { ...spec.config, body: event.target.value },
                                    })
                                }
                            />
                        </Field>
                    </>
                );
            case WidgetType.ACTIVITY: {
                const items = activities.data ?? [];
                return (
                    <Field label={t('widgetForm.activity')}>
                        <Select
                            value={spec.config.activityId === '' ? null : spec.config.activityId}
                            onValueChange={(value) => {
                                if (value !== null)
                                    patch({ type: spec.type, config: { activityId: value } });
                            }}
                            items={items.map((activity) => ({
                                value: activity.id,
                                label: activity.title,
                            }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('widgetForm.pickActivity')} />
                            </SelectTrigger>
                            <SelectContent>
                                {items.map((activity) => (
                                    <SelectItem key={activity.id} value={activity.id}>
                                        {activity.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                );
            }
            case WidgetType.LINK:
                return (
                    <>
                        <Field label={t('widgetForm.linkLabel')}>
                            <Input
                                autoFocus
                                maxLength={WIDGETS.LINK_LABEL_MAX_LENGTH}
                                value={spec.config.label}
                                onChange={(event) =>
                                    patch({
                                        type: spec.type,
                                        config: { ...spec.config, label: event.target.value },
                                    })
                                }
                            />
                        </Field>
                        <Field label={t('widgetForm.linkUrl')}>
                            <Input
                                type="url"
                                inputMode="url"
                                placeholder="https://"
                                maxLength={WIDGETS.URL_MAX_LENGTH}
                                value={spec.config.url}
                                onChange={(event) =>
                                    patch({
                                        type: spec.type,
                                        config: { ...spec.config, url: event.target.value },
                                    })
                                }
                            />
                        </Field>
                    </>
                );
        }
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t(`widgets.${spec.type}.name`)}</DialogTitle>
                    <DialogDescription>{t(`widgets.${spec.type}.description`)}</DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSave) onSubmit(spec);
                    }}
                >
                    {fields}
                    {problemText !== null && <FormMessage tone="error">{problemText}</FormMessage>}
                    {error !== null && <FormMessage tone="error">{error}</FormMessage>}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={() => onOpenChange(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={!canSave}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
