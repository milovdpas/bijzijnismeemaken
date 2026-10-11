'use client';

import { ParticipantMode, TOURNAMENT, TournamentFormat } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { NumberStepper } from '@/components/common/number-stepper';
import { PillGroup } from '@/components/common/pill-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { tournamentFormProblem } from '@/lib/tournament-form';
import type { TournamentFormState } from '@/lib/tournament-form';

/** A labelled switch row, as the other forms draw them. */
function SwitchRow({
    label,
    help,
    checked,
    disabled,
    onCheckedChange,
}: {
    label: string;
    help: string;
    checked: boolean;
    disabled: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
            <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{help}</span>
            </span>
            <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </label>
    );
}

/**
 * Every setting of a tournament, for creating and editing alike. Once it
 * runs (`locked`) only the name and the description can change, so the rest
 * stays visible but disabled. The caller turns the state into a request.
 */
export function TournamentForm({
    initial,
    locked,
    submitLabel,
    pending,
    error,
    onSubmit,
}: {
    initial: TournamentFormState;
    locked: boolean;
    submitLabel: string;
    pending: boolean;
    error: string | null;
    onSubmit: (form: TournamentFormState) => void;
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState<TournamentFormState>(initial);
    const [touched, setTouched] = useState(false);

    const problem = tournamentFormProblem(form);
    const canSave = problem === null && !pending;
    const patch = (changes: Partial<TournamentFormState>) => {
        setTouched(true);
        setForm((current) => ({ ...current, ...changes }));
    };
    const groups = form.format === TournamentFormat.GROUPS_KNOCKOUT;

    return (
        <form
            className="space-y-6"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (canSave) onSubmit(form);
            }}
        >
            <Field
                label={t('tournamentForm.name')}
                error={
                    touched && problem === 'NAME_LENGTH'
                        ? t('tournamentForm.problems.NAME_LENGTH', {
                              min: TOURNAMENT.NAME_MIN_LENGTH,
                              max: TOURNAMENT.NAME_MAX_LENGTH,
                          })
                        : null
                }
            >
                <Input
                    autoFocus
                    maxLength={TOURNAMENT.NAME_MAX_LENGTH}
                    value={form.name}
                    onChange={(event) => patch({ name: event.target.value })}
                />
            </Field>

            <Field label={t('tournamentForm.description')}>
                <Textarea
                    rows={3}
                    maxLength={TOURNAMENT.DESCRIPTION_MAX_LENGTH}
                    value={form.description}
                    onChange={(event) => patch({ description: event.target.value })}
                />
            </Field>

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('tournamentForm.playTitle')}</h2>
                {locked && (
                    <p className="text-xs text-muted-foreground">{t('tournamentForm.locked')}</p>
                )}
                <Field label={t('tournamentForm.format')} help={t('tournamentForm.formatHelp')}>
                    <PillGroup
                        options={Object.values(TournamentFormat)}
                        value={form.format}
                        labelFor={(format) => t(`tournamentFormats.${format}`)}
                        disabled={() => locked}
                        onChange={(format) => patch({ format })}
                    />
                </Field>
                <Field label={t('tournamentForm.participantMode')}>
                    <PillGroup
                        options={Object.values(ParticipantMode)}
                        value={form.participantMode}
                        labelFor={(mode) => t(`participantModes.${mode}`)}
                        disabled={() => locked}
                        onChange={(participantMode) => patch({ participantMode })}
                    />
                </Field>
                {form.participantMode === ParticipantMode.TEAMS && (
                    <Field
                        label={t('tournamentForm.teamSize')}
                        help={t('tournamentForm.teamSizeHelp')}
                    >
                        <NumberStepper
                            value={form.teamSize}
                            min={TOURNAMENT.TEAM_SIZE_MIN}
                            max={TOURNAMENT.TEAM_SIZE_MAX}
                            label={t('tournamentForm.teamSize')}
                            disabled={locked}
                            onChange={(teamSize) => patch({ teamSize })}
                        />
                    </Field>
                )}
                <SwitchRow
                    label={t('tournamentForm.thirdPlace')}
                    help={t('tournamentForm.thirdPlaceHelp')}
                    checked={form.thirdPlace}
                    disabled={locked}
                    onCheckedChange={(thirdPlace) => patch({ thirdPlace })}
                />
            </section>

            {groups && (
                <section className="space-y-4 rounded-2xl border p-4">
                    <h2 className="text-base">{t('tournamentForm.groupsTitle')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('tournamentForm.groupCount')}>
                            <NumberStepper
                                value={form.groupCount}
                                min={1}
                                max={TOURNAMENT.GROUP_COUNT_MAX}
                                label={t('tournamentForm.groupCount')}
                                disabled={locked}
                                onChange={(groupCount) => patch({ groupCount })}
                            />
                        </Field>
                        <Field
                            label={t('tournamentForm.advancePerGroup')}
                            help={t('tournamentForm.advanceHelp')}
                        >
                            <NumberStepper
                                value={form.advancePerGroup}
                                min={1}
                                max={TOURNAMENT.ADVANCE_PER_GROUP_MAX}
                                label={t('tournamentForm.advancePerGroup')}
                                disabled={locked}
                                onChange={(advancePerGroup) => patch({ advancePerGroup })}
                            />
                        </Field>
                        <Field label={t('tournamentForm.winPoints')}>
                            <NumberStepper
                                value={form.winPoints}
                                min={0}
                                max={TOURNAMENT.POINTS_MAX}
                                label={t('tournamentForm.winPoints')}
                                disabled={locked}
                                onChange={(winPoints) => patch({ winPoints })}
                            />
                        </Field>
                        <Field
                            label={t('tournamentForm.drawPoints')}
                            error={
                                touched && problem === 'POINTS'
                                    ? t('tournamentForm.problems.POINTS')
                                    : null
                            }
                        >
                            <NumberStepper
                                value={form.drawPoints}
                                min={0}
                                max={TOURNAMENT.POINTS_MAX}
                                label={t('tournamentForm.drawPoints')}
                                disabled={locked}
                                onChange={(drawPoints) => patch({ drawPoints })}
                            />
                        </Field>
                    </div>
                </section>
            )}

            {error !== null && <FormMessage tone="error">{error}</FormMessage>}
            <Button type="submit" disabled={!canSave} className="w-full sm:w-auto">
                {submitLabel}
            </Button>
        </form>
    );
}
