import { ACTIVITY, ActivityCategory, DateMode, activityRuleProblem } from '@bzim/types';
import type {
    ActivityDto,
    ActivityInput,
    ActivityRuleProblem,
    Daypart,
    Weekday,
} from '@bzim/types';

/**
 * The activity form as the inputs hold it: strings for everything typed,
 * because an `<input type="number">` being emptied is a string, not a null.
 * Conversion to the API shape happens once, in `toActivityInput`.
 */
export interface ActivityFormState {
    category: ActivityCategory;
    title: string;
    description: string;
    imageUrl: string;
    imageCreditName: string;
    imageCreditUrl: string;
    isRecurring: boolean;
    dateMode: DateMode;
    specificDate: string;
    weekday: Weekday | null;
    periodStart: string;
    periodEnd: string;
    startTime: string;
    locationText: string;
    locationUrl: string;
    minPeople: string;
    maxPeople: string;
    costPerPerson: string;
    durationMinutes: string;
    externalUrl: string;
    preferredDayparts: Daypart[];
}

export const blankActivityForm: ActivityFormState = {
    category: ActivityCategory.OTHER,
    title: '',
    description: '',
    imageUrl: '',
    imageCreditName: '',
    imageCreditUrl: '',
    isRecurring: false,
    dateMode: DateMode.NONE,
    specificDate: '',
    weekday: null,
    periodStart: '',
    periodEnd: '',
    startTime: '',
    locationText: '',
    locationUrl: '',
    minPeople: '',
    maxPeople: '',
    costPerPerson: '',
    durationMinutes: '',
    externalUrl: '',
    preferredDayparts: [],
};

export function activityToForm(activity: ActivityDto): ActivityFormState {
    return {
        category: activity.category,
        title: activity.title,
        description: activity.description ?? '',
        imageUrl: activity.imageUrl ?? '',
        imageCreditName: activity.imageCreditName ?? '',
        imageCreditUrl: activity.imageCreditUrl ?? '',
        isRecurring: activity.isRecurring,
        dateMode: activity.dateMode,
        specificDate: activity.specificDate ?? '',
        weekday: activity.weekday,
        periodStart: activity.periodStart ?? '',
        periodEnd: activity.periodEnd ?? '',
        startTime: activity.startTime ?? '',
        locationText: activity.locationText ?? '',
        locationUrl: activity.locationUrl ?? '',
        minPeople: activity.minPeople === null ? '' : String(activity.minPeople),
        maxPeople: activity.maxPeople === null ? '' : String(activity.maxPeople),
        costPerPerson: activity.costPerPerson === null ? '' : String(activity.costPerPerson),
        durationMinutes: activity.durationMinutes === null ? '' : String(activity.durationMinutes),
        externalUrl: activity.externalUrl ?? '',
        preferredDayparts: activity.preferredDayparts ?? [],
    };
}

export type ActivityFormProblem = ActivityRuleProblem | 'TITLE_LENGTH' | 'INVALID_NUMBER';

/** An empty field is "not set"; anything else must be a finite number. */
function parseNumber(raw: string): number | null | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const value = Number(trimmed.replace(',', '.'));
    return Number.isFinite(value) ? value : undefined;
}

/**
 * What is wrong with the form, or null when it can be sent. The cross-field
 * rules are the API's own, so Save is disabled for exactly the reasons the
 * API would answer 422.
 */
export function activityFormProblem(form: ActivityFormState): ActivityFormProblem | null {
    const title = form.title.trim();
    if (title.length < ACTIVITY.TITLE_MIN_LENGTH || title.length > ACTIVITY.TITLE_MAX_LENGTH) {
        return 'TITLE_LENGTH';
    }
    const numbers = [form.minPeople, form.maxPeople, form.costPerPerson, form.durationMinutes].map(
        parseNumber,
    );
    if (numbers.some((value) => value === undefined)) {
        return 'INVALID_NUMBER';
    }
    const [minPeople = null, maxPeople = null] = numbers;
    return activityRuleProblem({
        isRecurring: form.isRecurring,
        dateMode: form.dateMode,
        specificDate: form.specificDate === '' ? null : form.specificDate,
        weekday: form.weekday,
        periodStart: form.periodStart === '' ? null : form.periodStart,
        periodEnd: form.periodEnd === '' ? null : form.periodEnd,
        minPeople: minPeople ?? null,
        maxPeople: maxPeople ?? null,
    });
}

/** The form as the API takes it. Only call once `activityFormProblem` is null. */
export function toActivityInput(form: ActivityFormState): ActivityInput {
    const text = (value: string) => (value.trim() === '' ? null : value.trim());
    const number = (value: string) => parseNumber(value) ?? null;
    return {
        category: form.category,
        title: form.title.trim(),
        description: text(form.description),
        imageUrl: text(form.imageUrl),
        imageCreditName: text(form.imageCreditName),
        imageCreditUrl: text(form.imageCreditUrl),
        isRecurring: form.isRecurring,
        dateMode: form.dateMode,
        specificDate: form.dateMode === DateMode.SPECIFIC ? text(form.specificDate) : null,
        weekday: form.dateMode === DateMode.WEEKDAY ? form.weekday : null,
        periodStart: form.dateMode === DateMode.PERIOD ? text(form.periodStart) : null,
        periodEnd: form.dateMode === DateMode.PERIOD ? text(form.periodEnd) : null,
        startTime: text(form.startTime),
        locationText: text(form.locationText),
        locationUrl: text(form.locationUrl),
        minPeople: number(form.minPeople),
        maxPeople: number(form.maxPeople),
        costPerPerson: number(form.costPerPerson),
        durationMinutes: number(form.durationMinutes),
        externalUrl: text(form.externalUrl),
        preferredDayparts: form.preferredDayparts.length === 0 ? null : form.preferredDayparts,
    };
}
