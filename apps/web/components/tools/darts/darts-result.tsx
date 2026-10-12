'use client';

import { useTranslation } from 'react-i18next';

import { FinalStanding } from '@/components/tools/final-standing';
import { GameResult } from '@/components/tools/game-result';
import { PostWin } from '@/components/tools/post-win';
import { Button } from '@/components/ui/button';
import type { StoredUpdate } from '@/hooks/use-stored-state';
import { matchWinners, startGame, toSetup, winsOf } from '@/lib/tools/darts';
import type { DartsState } from '@/lib/tools/darts';
import { rankPlayers } from '@/lib/tools/players';

/**
 * An ended darts game: who won the most legs, the standing, the way to the
 * next game, and a sole winner's win onto a private board.
 */
export function DartsResult({
    groupId,
    state,
    update,
}: {
    groupId: string;
    state: DartsState;
    update: StoredUpdate<DartsState>;
}) {
    const { t } = useTranslation();
    const winners = matchWinners(state);
    const top = winners[0];

    return (
        <div className="space-y-4">
            <GameResult
                winners={winners}
                detail={
                    top === undefined
                        ? undefined
                        : t('tools.result.legs', { count: winsOf(state, top.id) })
                }
            >
                <Button onClick={() => update(startGame)}>{t('tools.newGame')}</Button>
                <Button variant="outline" onClick={() => update(toSetup)}>
                    {t('tools.changePlayers')}
                </Button>
                {winners.length === 1 && top !== undefined && (
                    <PostWin groupId={groupId} players={state.players} winner={top} />
                )}
            </GameResult>
            <FinalStanding
                rows={rankPlayers(state.players, (player) => winsOf(state, player.id))}
                format={(value) => t('tools.darts.legs', { count: value })}
                highlight={winners.length > 0}
            />
        </div>
    );
}
