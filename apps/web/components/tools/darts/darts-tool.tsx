'use client';

import { DartsBoard } from '@/components/tools/darts/darts-board';
import { DartsSetup } from '@/components/tools/darts/darts-setup';
import { useStoredState } from '@/hooks/use-stored-state';
import type { ToolProps } from '@/lib/tools';
import { emptyDarts, parseDartsState } from '@/lib/tools/darts';

/** Darts: choose the players and the game, then throw. */
export function DartsTool({ groupId, storageKey }: ToolProps) {
    const [state, update] = useStoredState(storageKey, parseDartsState, emptyDarts);

    return state.phase === 'setup' ? (
        <DartsSetup groupId={groupId} state={state} update={update} />
    ) : (
        <DartsBoard state={state} update={update} />
    );
}
