'use client';

import { EditMode, LEADERBOARD, ScoreType, SortOrder } from '@bzim/types';
import type { LeaderboardPeriod } from '@bzim/types';
import type { CreateLeaderboardInput, GroupMemberResponse } from '@bzim/types';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { PillGroup } from '@/components/common/pill-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    leaderboardFormProblem,
    toCreateLeaderboardInput,
    toLeaderboardInput,
} from '@/lib/leaderboard-form';
import { enabledPeriods } from '@/lib/leaderboard-periods';
import type { LeaderboardFormState } from '@/lib/leaderboard-form';

/** A labelled switch row, as the activity form draws them. */
function SwitchRow({
    label,
    help,
    checked,
    onCheckedChange,
}: {
    label: string;
    help?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
            <span>
                <span className="block text-sm font-semibold">{label}</span>
                {help !== undefined && (
                    <span className="block text-xs text-muted-foreground">{help}</span>
                )}
            </span>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </label>
    );
}

/**
 * Every setting of a leaderboard, for creating and editing alike. The caller
 * owns the request; this turns the inputs into the API's input once the
 * shared rules agree. `members` feeds the editor picker of the "selected"
 * mode and, on a new board, the people of a private one; `meId` is left out
 * of that, being on it anyway. Private or not is chosen once, when creating.
 */
export function LeaderboardForm({
    initial,
    members,
    meId,
    creating,
    submitLabel,
    pending,
    error,
    onSubmit,
}: {
    initial: LeaderboardFormState;
    members: GroupMemberResponse[];
    meId: string;
    creating: boolean;
    submitLabel: string;
    pending: boolean;
    error: string | null;
    onSubmit: (input: CreateLeaderboardInput) => void;
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState<LeaderboardFormState>(initial);
    const [touched, setTouched] = useState(false);

    const problem = leaderboardFormProblem(form);
    const canSave = problem === null && !pending;
    const patch = (changes: Partial<LeaderboardFormState>) => {
        setTouched(true);
        setForm((current) => ({ ...current, ...changes }));
    };
    const editors = new Set(form.editorIds);
    const shown = enabledPeriods(form);
    const cardPeriod: LeaderboardPeriod | undefined = shown.includes(form.cardPeriod)
        ? form.cardPeriod
        : shown[0];
    const toggleEditor = (userId: string, on: boolean) =>
        patch({
            editorIds: on
                ? [...form.editorIds, userId]
                : form.editorIds.filter((id) => id !== userId),
        });
    const others = members.filter((member) => member.user.id !== meId);
    const onBoard = new Set(form.memberIds);
    // The creator takes one of the places.
    const boardFull =
        form.memberIds.length + form.guestNames.length >= LEADERBOARD.PRIVATE_MEMBERS_MAX - 1;
    const toggleOnBoard = (userId: string, on: boolean) =>
        patch({
            memberIds: on
                ? [...form.memberIds, userId]
                : form.memberIds.filter((id) => id !== userId),
        });

    return (
        <form
            className="space-y-6"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (canSave) {
                    onSubmit(creating ? toCreateLeaderboardInput(form) : toLeaderboardInput(form));
                }
            }}
        >
            <Field
                label={t('leaderboardForm.name')}
                error={
                    touched && problem === 'NAME_LENGTH'
                        ? t('leaderboardForm.problems.NAME_LENGTH', {
                              min: LEADERBOARD.NAME_MIN_LENGTH,
                              max: LEADERBOARD.NAME_MAX_LENGTH,
                          })
                        : null
                }
            >
                <Input
                    autoFocus
                    maxLength={LEADERBOARD.NAME_MAX_LENGTH}
                    value={form.name}
                    onChange={(event) => patch({ name: event.target.value })}
                />
            </Field>

            <Field label={t('leaderboardForm.description')}>
                <Textarea
                    rows={3}
                    maxLength={LEADERBOARD.DESCRIPTION_MAX_LENGTH}
                    value={form.description}
                    onChange={(event) => patch({ description: event.target.value })}
                />
            </Field>

            {creating && (
                <section className="space-y-4 rounded-2xl border p-4">
                    <h2 className="text-base">{t('leaderboardForm.privacyTitle')}</h2>
                    <SwitchRow
                        label={t('leaderboardForm.private')}
                        help={t('leaderboardForm.privateHelp')}
                        checked={form.isPrivate}
                        onCheckedChange={(isPrivate) =>
                            // Mostly a running tally between a few: plus and minus to hand.
                            patch(isPrivate ? { isPrivate, showSteppers: true } : { isPrivate })
                        }
                    />
                    {form.isPrivate && (
                        <>
                            <p className="text-xs text-muted-foreground">
                                {t('leaderboardForm.privateMembersHelp', {
                                    count: LEADERBOARD.PRIVATE_MEMBERS_MAX - 1,
                                })}
                            </p>
                            <ul className="divide-y rounded-xl border">
                                {others.map((member) => (
                                    <li
                                        key={member.user.id}
                                        className="flex items-center gap-3 px-3 py-2"
                                    >
                                        <Avatar avatarKey={member.user.avatarKey} size="sm" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {member.user.displayName}
                                        </span>
                                        <Switch
                                            checked={onBoard.has(member.user.id)}
                                            disabled={!onBoard.has(member.user.id) && boardFull}
                                            aria-label={member.user.displayName}
                                            onCheckedChange={(on) =>
                                                toggleOnBoard(member.user.id, on)
                                            }
                                        />
                                    </li>
                                ))}
                            </ul>
                            {form.guestNames.length > 0 && (
                                <Field label={t('leaderboardForm.guests')}>
                                    <ul className="flex flex-wrap gap-2">
                                        {form.guestNames.map((name) => (
                                            <li
                                                key={name}
                                                className="flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-3 text-sm font-semibold"
                                            >
                                                {name}
                                                <Button
                                                    type="button"
                                                    size="icon-xs"
                                                    variant="ghost"
                                                    aria-label={t('leaderboardForm.removeGuest', {
                                                        name,
                                                    })}
                                                    onClick={() =>
                                                        patch({
                                                            guestNames: form.guestNames.filter(
                                                                (guest) => guest !== name,
                                                            ),
                                                        })
                                                    }
                                                >
                                                    <X />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </Field>
                            )}
                        </>
                    )}
                </section>
            )}

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('leaderboardForm.scoringTitle')}</h2>
                <Field
                    label={t('leaderboardForm.scoreType')}
                    help={t('leaderboardForm.scoreTypeHelp')}
                >
                    <PillGroup
                        options={Object.values(ScoreType)}
                        value={form.scoreType}
                        labelFor={(type) => t(`scoreTypes.${type}`)}
                        onChange={(scoreType) => patch({ scoreType })}
                    />
                </Field>
                <Field label={t('leaderboardForm.sortOrder')}>
                    <PillGroup
                        options={Object.values(SortOrder)}
                        value={form.sortOrder}
                        labelFor={(order) => t(`sortOrders.${order}`)}
                        onChange={(sortOrder) => patch({ sortOrder })}
                    />
                </Field>
                {form.scoreType === ScoreType.NUMBER && (
                    <SwitchRow
                        label={t('leaderboardForm.steppers')}
                        help={t('leaderboardForm.steppersHelp')}
                        checked={form.showSteppers}
                        onCheckedChange={(showSteppers) => patch({ showSteppers })}
                    />
                )}
            </section>

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('leaderboardForm.periodsTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('leaderboardForm.periodsHelp')}</p>
                <SwitchRow
                    label={t('periods.monthly')}
                    checked={form.showMonthly}
                    onCheckedChange={(showMonthly) => patch({ showMonthly })}
                />
                <SwitchRow
                    label={t('periods.yearly')}
                    checked={form.showYearly}
                    onCheckedChange={(showYearly) => patch({ showYearly })}
                />
                <SwitchRow
                    label={t('periods.total')}
                    checked={form.showAllTime}
                    onCheckedChange={(showAllTime) => patch({ showAllTime })}
                />
                {touched && problem === 'NO_PERIOD' && (
                    <FormMessage tone="error">
                        {t('leaderboardForm.problems.NO_PERIOD')}
                    </FormMessage>
                )}
                {cardPeriod !== undefined && (
                    <Field
                        label={t('leaderboardForm.cardPeriod')}
                        help={t('leaderboardForm.cardPeriodHelp')}
                    >
                        <PillGroup
                            options={shown}
                            value={cardPeriod}
                            labelFor={(period) => t(`periods.${period}`)}
                            onChange={(period) => patch({ cardPeriod: period })}
                        />
                    </Field>
                )}
            </section>

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('leaderboardForm.editorsTitle')}</h2>
                {form.isPrivate ? (
                    <p className="text-sm text-muted-foreground">
                        {t('leaderboardForm.privateEditors')}
                    </p>
                ) : (
                    <Field
                        label={t('leaderboardForm.editMode')}
                        help={t('leaderboardForm.editModeHelp')}
                    >
                        <PillGroup
                            options={Object.values(EditMode)}
                            value={form.editMode}
                            labelFor={(mode) => t(`editModes.${mode}`)}
                            onChange={(editMode) => patch({ editMode })}
                        />
                    </Field>
                )}
                {!form.isPrivate && form.editMode === EditMode.SELECTED && (
                    <ul className="divide-y rounded-xl border">
                        {members.map((member) => (
                            <li key={member.user.id} className="flex items-center gap-3 px-3 py-2">
                                <Avatar avatarKey={member.user.avatarKey} size="sm" />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                    {member.user.displayName}
                                </span>
                                <Switch
                                    checked={editors.has(member.user.id)}
                                    aria-label={member.user.displayName}
                                    onCheckedChange={(on) => toggleEditor(member.user.id, on)}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {error !== null && <FormMessage tone="error">{error}</FormMessage>}

            <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={!canSave}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
