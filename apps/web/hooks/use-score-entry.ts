'use client';

import type { LeaderboardDetailDto } from '@bzim/types';

import type { ScoreTarget } from '@/components/leaderboards/add-score-dialog';
import { useScoreNewPlayer, useSetScore, useStepScore } from '@/hooks/queries/use-leaderboards';
import { fetchScores } from '@/lib/api/leaderboards';
import type { ScoreScope } from '@/lib/api/leaderboards';
import { launchConfetti } from '@/lib/confetti';

/**
 * Saving a score for somebody on the board or somebody new, from any tab,
 * or one up or down from the steppers, with the confetti check afterwards:
 * when the score puts them at the top of `scope` and they were not the
 * leader already, the screen celebrates.
 */
export function useScoreEntry(
    groupId: string,
    leaderboard: LeaderboardDetailDto,
    scope: ScoreScope,
    leaderBefore: string | null,
): {
    save: (target: ScoreTarget, score: number, onSuccess: () => void) => void;
    clear: (memberId: string, onSuccess: () => void) => void;
    step: (memberId: string, delta: 1 | -1) => void;
    busy: boolean;
    error: Error | null;
} {
    const set = useSetScore(groupId, leaderboard.id);
    const scoreNew = useScoreNewPlayer(groupId, leaderboard.id);
    const stepper = useStepScore(groupId, leaderboard.id);

    const celebrate = (memberId: string) => {
        if (memberId === leaderBefore) return;
        void fetchScores(groupId, leaderboard.id, { ...scope, page: 1, pageSize: 1 }).then(
            (top) => {
                if (top.items[0]?.member.id === memberId) launchConfetti();
            },
        );
    };

    return {
        save: (target, score, onSuccess) => {
            const done = (memberId: string) => {
                onSuccess();
                celebrate(memberId);
            };
            if (target.kind === 'member') {
                set.mutate(
                    { memberId: target.memberId, score },
                    { onSuccess: () => done(target.memberId) },
                );
            } else {
                scoreNew.mutate({ who: target.who, score }, { onSuccess: done });
            }
        },
        clear: (memberId, onSuccess) => set.mutate({ memberId, score: null }, { onSuccess }),
        step: (memberId, delta) =>
            stepper.mutate(
                { memberId, delta },
                {
                    onSuccess: () => {
                        if (delta > 0) celebrate(memberId);
                    },
                },
            ),
        busy: set.isPending || scoreNew.isPending || stepper.isPending,
        error: set.error ?? scoreNew.error ?? stepper.error,
    };
}
