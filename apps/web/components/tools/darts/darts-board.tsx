'use client';

import { RotateCcw, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DartsHistory } from '@/components/tools/darts/darts-history';
import { DartsScoreboard } from '@/components/tools/darts/darts-scoreboard';
import { DartsTurnInput } from '@/components/tools/darts/darts-turn-input';
import { Button } from '@/components/ui/button';
import type { StoredUpdate } from '@/hooks/use-stored-state';
import { legWinner, nextLeg, toSetup, undoTurn } from '@/lib/tools/darts';
import type { DartsState } from '@/lib/tools/darts';

/** A leg being played: the scoreboard, the turn being entered, and the turns so far. */
export function DartsBoard({
    state,
    update,
}: {
    state: DartsState;
    update: StoredUpdate<DartsState>;
}) {
    const { t } = useTranslation();
    const [leaving, setLeaving] = useState(false);
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

            <div className="flex flex-wrap gap-2">
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
                <Button variant="ghost" size="sm" onClick={() => setLeaving(true)}>
                    <RotateCcw />
                    {t('tools.newGame')}
                </Button>
            </div>

            <DartsHistory state={state} />

            <ConfirmDialog
                open={leaving}
                onOpenChange={setLeaving}
                title={t('tools.newGameTitle')}
                description={t('tools.darts.newGameDescription')}
                confirmLabel={t('tools.newGame')}
                onConfirm={() => {
                    update(toSetup);
                    setLeaving(false);
                }}
            />
        </div>
    );
}
