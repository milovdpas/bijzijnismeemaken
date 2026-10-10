'use client';

import { EditMode, LEADERBOARD, ScoreType, SortOrder } from '@bzim/types';
import type { LeaderboardPeriod } from '@bzim/types';
import type { GroupMemberResponse, LeaderboardInput } from '@bzim/types';
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
import { leaderboardFormProblem, toLeaderboardInput } from '@/lib/leaderboard-form';
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
 * owns the request; this turns the inputs into a `LeaderboardInput` once the
 * shared rules agree. `members` feeds the editor picker of the "selected" mode.
 */
export function LeaderboardForm({
    initial,
    members,
    submitLabel,
    pending,
    error,
    onSubmit,
}: {
    initial: LeaderboardFormState;
    members: GroupMemberResponse[];
    submitLabel: string;
    pending: boolean;
    error: string | null;
    onSubmit: (input: LeaderboardInput) => void;
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

    return (
        <form
            className="space-y-6"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (canSave) onSubmit(toLeaderboardInput(form));
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
                {form.editMode === EditMode.SELECTED && (
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
