'use client';

import { DartsBoard } from '@/components/tools/darts/darts-board';
import { DartsResult } from '@/components/tools/darts/darts-result';
import { DartsSetup } from '@/components/tools/darts/darts-setup';
import { useStoredState } from '@/hooks/use-stored-state';
import type { ToolProps } from '@/lib/tools';
import { emptyDarts, parseDartsState } from '@/lib/tools/darts';

/** Darts: choose the players and the game, throw, and see who won when it is over. */
export function DartsTool({ groupId, storageKey }: ToolProps) {
    const [state, update] = useStoredState(storageKey, parseDartsState, emptyDarts);

    if (state.phase === 'setup') {
        return <DartsSetup groupId={groupId} state={state} update={update} />;
    }
    if (state.phase === 'finished') return <DartsResult state={state} update={update} />;
    return <DartsBoard state={state} update={update} />;
}
