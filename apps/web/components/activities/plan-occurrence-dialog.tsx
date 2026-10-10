'use client';

import { ACTIVITY, DAYPART_ORDER } from '@bzim/types';
import type {
    ActivityDetailDto,
    Daypart,
    GroupMemberResponse,
    OccurrenceDto,
    OccurrenceInput,
} from '@bzim/types';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
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
import { Switch } from '@/components/ui/switch';
import { useMembers } from '@/hooks/queries/use-members';
import { cn } from '@/lib/utils';

interface FormState {
    date: string;
    daypart: Daypart | null;
    startTime: string;
    notes: string;
    participantIds: string[];
}

/** The people who said they are in first, then the rest of the group, each part by name. */
function orderMembers(members: GroupMemberResponse[], inIds: Set<string>): GroupMemberResponse[] {
    return [...members].sort((a, b) => {
        const aIn = inIds.has(a.user.id) ? 0 : 1;
        const bIn = inIds.has(b.user.id) ? 0 : 1;
        return aIn - bIn || a.user.displayName.localeCompare(b.user.displayName);
    });
}

/**
 * Put the activity on a date: when, and who counts for it. Anyone in the
 * group can be picked; the people who already said they are in come first
 * and start switched on. Serves both planning and re-dating. Date
 * suggestions arrive in task 25.
 */
export function PlanOccurrenceDialog({
    groupId,
    activity,
    existing,
    open,
    onOpenChange,
    pending,
    error,
    onSubmit,
}: {
    groupId: string;
    activity: ActivityDetailDto;
    existing: OccurrenceDto | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pending: boolean;
    error: string | null;
    onSubmit: (input: OccurrenceInput) => void;
}) {
    const { t } = useTranslation();
    const members = useMembers(groupId);
    const inIds = new Set(activity.interests.map((user) => user.id));
    const [form, setForm] = useState<FormState>(() => ({
        date: existing?.date ?? '',
        daypart: existing?.daypart ?? activity.preferredDayparts?.[0] ?? null,
        startTime: existing?.startTime ?? activity.startTime ?? '',
        notes: existing?.notes ?? '',
        participantIds:
            existing?.participants.map((user) => user.id) ??
            activity.interests.map((user) => user.id),
    }));
    const canSave = form.date !== '' && !pending;

    const toggle = (userId: string) =>
        setForm((current) => ({
            ...current,
            participantIds: current.participantIds.includes(userId)
                ? current.participantIds.filter((id) => id !== userId)
                : [...current.participantIds, userId],
        }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {existing === null
                            ? t('planDialog.title', { title: activity.title })
                            : t('planDialog.editTitle')}
                    </DialogTitle>
                    <DialogDescription>{t('planDialog.description')}</DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!canSave) return;
                        onSubmit({
                            date: form.date,
                            daypart: form.daypart,
                            startTime: form.startTime === '' ? null : form.startTime,
                            notes: form.notes.trim() === '' ? null : form.notes.trim(),
                            participantIds: form.participantIds,
                        });
                    }}
                >
                    <div className="grid items-start gap-4 sm:grid-cols-2">
                        <Field label={t('planDialog.date')}>
                            <Input
                                type="date"
                                autoFocus
                                value={form.date}
                                onChange={(event) => setForm({ ...form, date: event.target.value })}
                            />
                        </Field>
                        <Field label={t('planDialog.startTime')}>
                            <Input
                                type="time"
                                value={form.startTime}
                                onChange={(event) =>
                                    setForm({ ...form, startTime: event.target.value })
                                }
                            />
                        </Field>
                    </div>
                    <Field label={t('planDialog.daypart')} help={t('planDialog.daypartHelp')}>
                        <div className="flex flex-wrap gap-2" role="radiogroup">
                            {DAYPART_ORDER.map((daypart) => (
                                <button
                                    key={daypart}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.daypart === daypart}
                                    onClick={() =>
                                        setForm({
                                            ...form,
                                            daypart: form.daypart === daypart ? null : daypart,
                                        })
                                    }
                                    className={cn(
                                        'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                                        form.daypart === daypart
                                            ? 'border-brand bg-brand text-brand-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    )}
                                >
                                    {t(`dayparts.${daypart}`)}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field
                        label={t('planDialog.participants')}
                        help={t('planDialog.participantsHelp')}
                    >
                        {members.data === undefined ? (
                            <div className="h-24 animate-pulse rounded-xl bg-muted" />
                        ) : (
                            <ul className="divide-y rounded-xl border">
                                {orderMembers(members.data, inIds).map((member) => (
                                    <li
                                        key={member.user.id}
                                        className="flex items-center gap-3 px-3 py-2"
                                    >
                                        <Avatar avatarKey={member.user.avatarKey} size="sm" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {member.user.displayName}
                                        </span>
                                        {inIds.has(member.user.id) && (
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <Check className="size-3.5" />
                                                {t('planDialog.isIn')}
                                            </span>
                                        )}
                                        <Switch
                                            checked={form.participantIds.includes(member.user.id)}
                                            aria-label={member.user.displayName}
                                            onCheckedChange={() => toggle(member.user.id)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Field>
                    <Field label={t('planDialog.notes')}>
                        <Input
                            maxLength={ACTIVITY.NOTES_MAX_LENGTH}
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        />
                    </Field>
                    {error !== null && <FormMessage tone="error">{error}</FormMessage>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={!canSave}>
                            {existing === null ? t('planDialog.submit') : t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
