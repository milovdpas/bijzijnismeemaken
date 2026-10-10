import { EditMode, LEADERBOARD, LeaderboardPeriod, ScoreType, SortOrder } from '@bzim/types';
import type { LeaderboardDetailDto, LeaderboardInput } from '@bzim/types';

import { enabledPeriods } from './leaderboard-periods';

/** The leaderboard form as the inputs hold it. Conversion happens once, in `toLeaderboardInput`. */
export interface LeaderboardFormState {
    name: string;
    description: string;
    scoreType: ScoreType;
    sortOrder: SortOrder;
    editMode: EditMode;
    editorIds: string[];
    showMonthly: boolean;
    showYearly: boolean;
    showAllTime: boolean;
    showSteppers: boolean;
    cardPeriod: LeaderboardPeriod;
}

export const blankLeaderboardForm: LeaderboardFormState = {
    name: '',
    description: '',
    scoreType: ScoreType.NUMBER,
    sortOrder: SortOrder.DESC,
    editMode: EditMode.EVERYONE,
    editorIds: [],
    showMonthly: true,
    showYearly: true,
    showAllTime: true,
    showSteppers: false,
    cardPeriod: LeaderboardPeriod.TOTAL,
};

export function leaderboardToForm(board: LeaderboardDetailDto): LeaderboardFormState {
    return {
        name: board.name,
        description: board.description ?? '',
        scoreType: board.scoreType,
        sortOrder: board.sortOrder,
        editMode: board.editMode,
        editorIds: board.editors.map((user) => user.id),
        showMonthly: board.showMonthly,
        showYearly: board.showYearly,
        showAllTime: board.showAllTime,
        showSteppers: board.showSteppers,
        cardPeriod: board.cardPeriod,
    };
}

/** The chosen card period while it is shown, else the first shown one. Only call once a period is shown. */
export function cardPeriodFor(form: LeaderboardFormState): LeaderboardPeriod {
    const shown = enabledPeriods(form);
    return shown.includes(form.cardPeriod)
        ? form.cardPeriod
        : (shown[0] ?? LeaderboardPeriod.TOTAL);
}

export type LeaderboardFormProblem = 'NAME_LENGTH' | 'NO_PERIOD';

/** What is wrong with the form, or null when it can be sent. `NO_PERIOD` is the API's own rule. */
export function leaderboardFormProblem(form: LeaderboardFormState): LeaderboardFormProblem | null {
    const name = form.name.trim();
    if (name.length < LEADERBOARD.NAME_MIN_LENGTH || name.length > LEADERBOARD.NAME_MAX_LENGTH) {
        return 'NAME_LENGTH';
    }
    if (!form.showMonthly && !form.showYearly && !form.showAllTime) {
        return 'NO_PERIOD';
    }
    return null;
}

/**
 * The form as the API takes it. Editors only travel with the `selected`
 * mode, steppers only with points, and the card period is one of the shown
 * periods (else the first shown), which is also what the API enforces.
 */
export function toLeaderboardInput(form: LeaderboardFormState): LeaderboardInput {
    const description = form.description.trim();
    return {
        name: form.name.trim(),
        description: description === '' ? null : description,
        scoreType: form.scoreType,
        sortOrder: form.sortOrder,
        editMode: form.editMode,
        editorIds: form.editMode === EditMode.SELECTED ? form.editorIds : [],
        showMonthly: form.showMonthly,
        showYearly: form.showYearly,
        showAllTime: form.showAllTime,
        showSteppers: form.scoreType === ScoreType.NUMBER && form.showSteppers,
        cardPeriod: cardPeriodFor(form),
    };
}
