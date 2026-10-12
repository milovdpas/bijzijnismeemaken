import { EditMode, LEADERBOARD, LeaderboardPeriod, ScoreType, SortOrder } from '@bzim/types';
import type {
    CreateLeaderboardInput,
    GroupMemberResponse,
    LeaderboardDetailDto,
    LeaderboardInput,
} from '@bzim/types';

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
    /** Only chosen on a new board. */
    isPrivate: boolean;
    /** Who else is on a new private board; the creator always is. */
    memberIds: string[];
    /** Players without an account on a new private board, by name. */
    guestNames: string[];
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
    isPrivate: false,
    memberIds: [],
    guestNames: [],
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
        isPrivate: board.isPrivate,
        memberIds: [],
        guestNames: [],
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

/**
 * A new board as the API takes it. A private one also carries who else is
 * on it, and no editors: everybody on it enters scores.
 */
export function toCreateLeaderboardInput(form: LeaderboardFormState): CreateLeaderboardInput {
    const input = toLeaderboardInput(form);
    return form.isPrivate
        ? {
              ...input,
              editMode: EditMode.EVERYONE,
              editorIds: [],
              isPrivate: true,
              memberIds: form.memberIds,
              guestNames: form.guestNames,
          }
        : input;
}

/** "Milo vs Anna" for two players, "Milo, Anna and Bob" for more; cut to the name limit. */
export function gameBoardName(players: readonly string[], versus: string, locale: string): string {
    const name =
        players.length === 2
            ? players.join(` ${versus} `)
            : new Intl.ListFormat(locale, { type: 'conjunction' }).format(players);
    return name.slice(0, LEADERBOARD.NAME_MAX_LENGTH).trim();
}

/**
 * A new private board for the people of a game, who come from the tool by
 * name: the group members among them on it (the creator is anyway), the
 * rest as guests, as many as fit, members first; the plus and minus
 * buttons on, and `name` as its name.
 */
export function gameBoardForm(
    players: readonly string[],
    members: readonly GroupMemberResponse[],
    meId: string,
    name: string,
): LeaderboardFormState {
    const memberIds: string[] = [];
    const guestNames: string[] = [];
    for (const player of players) {
        const member = members.find(
            (candidate) => candidate.user.displayName.toLowerCase() === player.toLowerCase(),
        );
        if (member === undefined) {
            guestNames.push(player);
        } else if (member.user.id !== meId && !memberIds.includes(member.user.id)) {
            memberIds.push(member.user.id);
        }
    }
    const places = LEADERBOARD.PRIVATE_MEMBERS_MAX - 1;
    return {
        ...blankLeaderboardForm,
        name,
        isPrivate: true,
        showSteppers: true,
        memberIds: memberIds.slice(0, places),
        guestNames: guestNames.slice(0, Math.max(0, places - memberIds.length)),
    };
}
