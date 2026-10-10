'use client';

import { Info } from 'luxon';
import { ACTIVITY, DateMode } from '@bzim/types';
import type { ActivityInput, Weekday } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CategoryPicker } from '@/components/activities/category-picker';
import { DaypartPicker } from '@/components/activities/daypart-picker';
import { ImageField } from '@/components/common/image-field';
import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { activityFormProblem, toActivityInput } from '@/lib/activity-form';
import type { ActivityFormState } from '@/lib/activity-form';
import { cn } from '@/lib/utils';

const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Every field of an activity, for creating and editing alike. The caller
 * owns the request: this only turns the inputs into an `ActivityInput` once
 * the shared rules say it is consistent, and shows why Save is off until then.
 */
export function ActivityForm({
    initial,
    submitLabel,
    pending,
    error,
    onSubmit,
}: {
    initial: ActivityFormState;
    submitLabel: string;
    pending: boolean;
    error: string | null;
    onSubmit: (input: ActivityInput) => void;
}) {
    const { t, i18n } = useTranslation();
    const [form, setForm] = useState<ActivityFormState>(initial);
    const [touched, setTouched] = useState(false);
    const weekdayNames = Info.weekdays('long', { locale: i18n.language });

    const problem = activityFormProblem(form);
    const canSave = problem === null && !pending;

    const patch = (changes: Partial<ActivityFormState>) => {
        setTouched(true);
        setForm((current) => ({ ...current, ...changes }));
    };

    // Switching date mode clears what the other modes carried, so the rules
    // never complain about a leftover the person cannot see.
    const chooseDateMode = (dateMode: DateMode) =>
        patch({
            dateMode,
            specificDate: dateMode === DateMode.SPECIFIC ? form.specificDate : '',
            weekday: dateMode === DateMode.WEEKDAY ? form.weekday : null,
        });

    const chooseRecurring = (isRecurring: boolean) =>
        patch(
            isRecurring && form.dateMode === DateMode.SPECIFIC
                ? { isRecurring, dateMode: DateMode.NONE, specificDate: '' }
                : { isRecurring },
        );

    return (
        <form
            className="space-y-6"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (canSave) onSubmit(toActivityInput(form));
            }}
        >
            <Field label={t('activityForm.category')}>
                <CategoryPicker
                    value={form.category}
                    onChange={(category) => patch({ category })}
                />
            </Field>

            <Field
                label={t('activityForm.title')}
                error={
                    touched && problem === 'TITLE_LENGTH'
                        ? t('activityForm.problems.TITLE_LENGTH', {
                              min: ACTIVITY.TITLE_MIN_LENGTH,
                              max: ACTIVITY.TITLE_MAX_LENGTH,
                          })
                        : null
                }
            >
                <Input
                    autoFocus
                    maxLength={ACTIVITY.TITLE_MAX_LENGTH}
                    value={form.title}
                    onChange={(event) => patch({ title: event.target.value })}
                />
            </Field>

            <Field label={t('activityForm.description')}>
                <Textarea
                    rows={3}
                    maxLength={ACTIVITY.DESCRIPTION_MAX_LENGTH}
                    value={form.description}
                    onChange={(event) => patch({ description: event.target.value })}
                />
            </Field>

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('activityForm.when')}</h2>

                <Field label={t('activityForm.dateMode')}>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                        {Object.values(DateMode).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={form.dateMode === mode}
                                disabled={form.isRecurring && mode === DateMode.SPECIFIC}
                                onClick={() => chooseDateMode(mode)}
                                className={cn(
                                    'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40',
                                    form.dateMode === mode
                                        ? 'border-brand bg-brand text-brand-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                {t(`dateModes.${mode}`)}
                            </button>
                        ))}
                    </div>
                </Field>

                <div className="grid items-start gap-4 sm:grid-cols-2">
                    {form.dateMode === DateMode.SPECIFIC && (
                        <Field
                            label={t('activityForm.specificDate')}
                            error={
                                touched && problem === 'SPECIFIC_DATE_MISMATCH'
                                    ? t('activityForm.problems.SPECIFIC_DATE_MISMATCH')
                                    : null
                            }
                        >
                            <Input
                                type="date"
                                value={form.specificDate}
                                onChange={(event) => patch({ specificDate: event.target.value })}
                            />
                        </Field>
                    )}
                    {form.dateMode === DateMode.WEEKDAY && (
                        <Field
                            label={t('activityForm.weekday')}
                            error={
                                touched && problem === 'WEEKDAY_MISMATCH'
                                    ? t('activityForm.problems.WEEKDAY_MISMATCH')
                                    : null
                            }
                        >
                            <Select
                                value={form.weekday === null ? null : String(form.weekday)}
                                onValueChange={(value) =>
                                    patch({
                                        weekday: value === null ? null : (Number(value) as Weekday),
                                    })
                                }
                                items={WEEKDAYS.map((day) => ({
                                    value: String(day),
                                    label: weekdayNames[day - 1] ?? String(day),
                                }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={t('activityForm.weekdayPlaceholder')}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {WEEKDAYS.map((day) => (
                                        <SelectItem key={day} value={String(day)}>
                                            {weekdayNames[day - 1]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                    <Field label={t('activityForm.startTime')}>
                        <Input
                            type="time"
                            value={form.startTime}
                            onChange={(event) => patch({ startTime: event.target.value })}
                        />
                    </Field>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                    <span>
                        <span className="block text-sm font-semibold">
                            {t('activityForm.recurring')}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                            {t('activityForm.recurringHelp')}
                        </span>
                    </span>
                    <Switch checked={form.isRecurring} onCheckedChange={chooseRecurring} />
                </label>

                <Field
                    label={t('activityForm.preferredDayparts')}
                    help={t('activityForm.preferredHelp')}
                >
                    <DaypartPicker
                        value={form.preferredDayparts}
                        onChange={(preferredDayparts) => patch({ preferredDayparts })}
                    />
                </Field>
            </section>

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('activityForm.detailsTitle')}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('activityForm.location')}>
                        <Input
                            maxLength={ACTIVITY.LOCATION_MAX_LENGTH}
                            value={form.locationText}
                            onChange={(event) => patch({ locationText: event.target.value })}
                        />
                    </Field>
                    <Field label={t('activityForm.locationUrl')}>
                        <Input
                            type="url"
                            inputMode="url"
                            value={form.locationUrl}
                            onChange={(event) => patch({ locationUrl: event.target.value })}
                        />
                    </Field>
                    <Field label={t('activityForm.minPeople')}>
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={ACTIVITY.PEOPLE_MAX}
                            value={form.minPeople}
                            onChange={(event) => patch({ minPeople: event.target.value })}
                        />
                    </Field>
                    <Field
                        label={t('activityForm.maxPeople')}
                        error={
                            touched && problem === 'PEOPLE_RANGE'
                                ? t('activityForm.problems.PEOPLE_RANGE')
                                : null
                        }
                    >
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={ACTIVITY.PEOPLE_MAX}
                            value={form.maxPeople}
                            onChange={(event) => patch({ maxPeople: event.target.value })}
                        />
                    </Field>
                    <Field label={t('activityForm.cost')}>
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={form.costPerPerson}
                            onChange={(event) => patch({ costPerPerson: event.target.value })}
                        />
                    </Field>
                    <Field label={t('activityForm.duration')}>
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={5}
                            max={ACTIVITY.DURATION_MAX_MINUTES}
                            step={5}
                            value={form.durationMinutes}
                            onChange={(event) => patch({ durationMinutes: event.target.value })}
                        />
                    </Field>
                    <Field label={t('activityForm.externalUrl')}>
                        <Input
                            type="url"
                            inputMode="url"
                            value={form.externalUrl}
                            onChange={(event) => patch({ externalUrl: event.target.value })}
                        />
                    </Field>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border p-4">
                <h2 className="text-base">{t('imageField.sectionTitle')}</h2>
                <ImageField
                    value={form.imageUrl}
                    credit={
                        form.imageCreditName === ''
                            ? null
                            : { name: form.imageCreditName, url: form.imageCreditUrl }
                    }
                    onChange={(imageUrl, credit) =>
                        patch({
                            imageUrl,
                            imageCreditName: credit?.name ?? '',
                            imageCreditUrl: credit?.url ?? '',
                        })
                    }
                    suggestedQuery={form.title.trim()}
                />
            </section>

            {touched &&
                problem !== null &&
                (problem === 'INVALID_NUMBER' || problem === 'RECURRING_WITH_SPECIFIC_DATE') && (
                    <FormMessage tone="error">{t(`activityForm.problems.${problem}`)}</FormMessage>
                )}
            {error !== null && <FormMessage tone="error">{error}</FormMessage>}

            <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={!canSave}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
