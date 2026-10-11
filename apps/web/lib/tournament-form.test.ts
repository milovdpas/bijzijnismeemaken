import { describe, expect, it } from 'vitest';
import { ParticipantMode, TournamentFormat, TournamentStatus } from '@bzim/types';

import {
    blankTournamentForm,
    settingsLocked,
    toTournamentInput,
    toTournamentPatch,
    tournamentFormProblem,
} from './tournament-form';

const named = { ...blankTournamentForm, name: '  Pingpong  ', description: '  ' };

describe('tournament form', () => {
    it('needs a name of the right length and a draw worth no more than a win', () => {
        expect(tournamentFormProblem(blankTournamentForm)).toBe('NAME_LENGTH');
        expect(tournamentFormProblem({ ...blankTournamentForm, name: 'x' })).toBe('NAME_LENGTH');
        expect(tournamentFormProblem(named)).toBeNull();
        const groups = { ...named, format: TournamentFormat.GROUPS_KNOCKOUT };
        expect(tournamentFormProblem({ ...groups, winPoints: 1, drawPoints: 2 })).toBe('POINTS');
    });

    it('lets a knockout ignore the points, which it never counts', () => {
        const knockout = { ...named, winPoints: 1, drawPoints: 2 };
        expect(tournamentFormProblem(knockout)).toBeNull();
        expect(toTournamentInput(knockout, null)).toMatchObject({ winPoints: 3, drawPoints: 1 });
    });

    it('sends a knockout of players without a team size or groups', () => {
        expect(toTournamentInput(named, null)).toEqual({
            name: 'Pingpong',
            description: null,
            format: TournamentFormat.KNOCKOUT,
            participantMode: ParticipantMode.PLAYERS,
            teamSize: null,
            winPoints: 3,
            drawPoints: 1,
            groupCount: null,
            advancePerGroup: null,
            thirdPlace: false,
            activityId: null,
        });
    });

    it('keeps the team size for teams and the group settings for a group stage', () => {
        const input = toTournamentInput(
            {
                ...named,
                participantMode: ParticipantMode.TEAMS,
                teamSize: 3,
                format: TournamentFormat.GROUPS_KNOCKOUT,
                groupCount: 4,
                advancePerGroup: 1,
            },
            'activity-1',
        );
        expect(input).toMatchObject({
            teamSize: 3,
            groupCount: 4,
            advancePerGroup: 1,
            activityId: 'activity-1',
        });
    });

    it('edits only the name and description once it runs', () => {
        const form = { ...named, description: 'Friday', format: TournamentFormat.GROUPS_KNOCKOUT };
        expect(settingsLocked({ status: TournamentStatus.DRAFT })).toBe(false);
        expect(settingsLocked({ status: TournamentStatus.RUNNING })).toBe(true);
        expect(toTournamentPatch(form, true)).toEqual({ name: 'Pingpong', description: 'Friday' });
        expect(toTournamentPatch(form, false)).toMatchObject({
            format: TournamentFormat.GROUPS_KNOCKOUT,
            groupCount: 2,
        });
    });
});
