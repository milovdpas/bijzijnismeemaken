import { ParticipantMode, TOURNAMENT, TournamentFormat, TournamentStatus } from '@bzim/types';
import type { TournamentDetailDto, TournamentInput, TournamentSettings } from '@bzim/types';

/**
 * The tournament form as the inputs hold it. Team size and the group
 * settings keep a value even when they do not apply, so switching the
 * format back and forth does not lose what was typed; `toTournamentInput`
 * leaves them out.
 */
export interface TournamentFormState {
    name: string;
    description: string;
    format: TournamentFormat;
    participantMode: ParticipantMode;
    teamSize: number;
    winPoints: number;
    drawPoints: number;
    groupCount: number;
    advancePerGroup: number;
    thirdPlace: boolean;
}

export const blankTournamentForm: TournamentFormState = {
    name: '',
    description: '',
    format: TournamentFormat.KNOCKOUT,
    participantMode: ParticipantMode.PLAYERS,
    teamSize: TOURNAMENT.TEAM_SIZE_MIN,
    winPoints: 3,
    drawPoints: 1,
    groupCount: 2,
    advancePerGroup: 2,
    thirdPlace: false,
};

export function tournamentToForm(tournament: TournamentDetailDto): TournamentFormState {
    return {
        name: tournament.name,
        description: tournament.description ?? '',
        format: tournament.format,
        participantMode: tournament.participantMode,
        teamSize: tournament.teamSize ?? blankTournamentForm.teamSize,
        winPoints: tournament.winPoints,
        drawPoints: tournament.drawPoints,
        groupCount: tournament.groupCount ?? blankTournamentForm.groupCount,
        advancePerGroup: tournament.advancePerGroup ?? blankTournamentForm.advancePerGroup,
        thirdPlace: tournament.thirdPlace,
    };
}

export type TournamentFormProblem = 'NAME_LENGTH' | 'POINTS';

/**
 * What is wrong with the form, or null when it can be sent. `POINTS` is the
 * API's own rule; it only bites in a group stage, the one place points count.
 */
export function tournamentFormProblem(form: TournamentFormState): TournamentFormProblem | null {
    const name = form.name.trim();
    if (name.length < TOURNAMENT.NAME_MIN_LENGTH || name.length > TOURNAMENT.NAME_MAX_LENGTH) {
        return 'NAME_LENGTH';
    }
    if (form.format === TournamentFormat.GROUPS_KNOCKOUT && form.drawPoints > form.winPoints) {
        return 'POINTS';
    }
    return null;
}

/** Only a draft changes more than its name and description; the API refuses the rest after the start. */
export function settingsLocked(tournament: Pick<TournamentDetailDto, 'status'>): boolean {
    return tournament.status !== TournamentStatus.DRAFT;
}

/**
 * The settings as the API takes them: a team size only for teams, the group
 * settings only for a group stage. A knockout never counts points, so it
 * gets the defaults rather than whatever the hidden fields last held.
 */
export function toTournamentSettings(form: TournamentFormState): TournamentSettings {
    const description = form.description.trim();
    const groups = form.format === TournamentFormat.GROUPS_KNOCKOUT;
    return {
        name: form.name.trim(),
        description: description === '' ? null : description,
        format: form.format,
        participantMode: form.participantMode,
        teamSize: form.participantMode === ParticipantMode.TEAMS ? form.teamSize : null,
        winPoints: groups ? form.winPoints : blankTournamentForm.winPoints,
        drawPoints: groups ? form.drawPoints : blankTournamentForm.drawPoints,
        groupCount: groups ? form.groupCount : null,
        advancePerGroup: groups ? form.advancePerGroup : null,
        thirdPlace: form.thirdPlace,
    };
}

/** A new tournament, tied to an activity when it is made from one. */
export function toTournamentInput(
    form: TournamentFormState,
    activityId: string | null,
): TournamentInput {
    return { ...toTournamentSettings(form), activityId };
}

/**
 * An edit. Once a tournament runs only the name and the description go,
 * because the API refuses any other field then, even an unchanged one.
 */
export function toTournamentPatch(
    form: TournamentFormState,
    locked: boolean,
): Partial<TournamentSettings> {
    const settings = toTournamentSettings(form);
    return locked ? { name: settings.name, description: settings.description } : settings;
}
