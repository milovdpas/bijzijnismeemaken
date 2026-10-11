'use client';

import { Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DartsHistory } from '@/components/tools/darts/darts-history';
import { DartsScoreboard } from '@/components/tools/darts/darts-scoreboard';
import { DartsTurnInput } from '@/components/tools/darts/darts-turn-input';
import { GameActions } from '@/components/tools/game-actions';
import { Button } from '@/components/ui/button';
import type { StoredUpdate } from '@/hooks/use-stored-state';
import { launchConfetti } from '@/lib/confetti';
import { endDarts, legWinner, matchWinners, nextLeg, toSetup, undoTurn } from '@/lib/tools/darts';
import type { DartsState } from '@/lib/tools/darts';

/**
 * A leg being played: the scoreboard, the turn being entered, and the turns
 * so far. The game can be ended at any point (the legs won decide) or
 * cancelled.
 */
export function DartsBoard({
    state,
    update,
}: {
    state: DartsState;
    update: StoredUpdate<DartsState>;
}) {
    const { t } = useTranslation();
    const winner = legWinner(state);

    return (
        <div className="space-y-4">
            <DartsScoreboard state={state} />

            {winner === null ? (
                <DartsTurnInput state={state} update={update} />
            ) : (
                <section className="space-y-3 rounded-2xl border-2 border-brand bg-brand/15 p-4 text-center">
                    <p className="text-lg font-extrabold text-ink">
                        {t('tools.darts.wins', { name: winner.name })}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button variant="outline" onClick={() => update(undoTurn)}>
                            <Undo2 />
                            {t('tools.undo')}
                        </Button>
                        <Button onClick={() => update(nextLeg)}>{t('tools.darts.nextLeg')}</Button>
                    </div>
                </section>
            )}

            <GameActions
                onEnd={() => {
                    update(endDarts);
                    if (matchWinners(endDarts(state)).length > 0) launchConfetti();
                }}
                onCancel={() => update(toSetup)}
            >
                {winner === null && (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={state.turns.length === 0}
                        onClick={() => update(undoTurn)}
                    >
                        <Undo2 />
                        {t('tools.undo')}
                    </Button>
                )}
            </GameActions>

            <DartsHistory state={state} />
        </div>
    );
}
