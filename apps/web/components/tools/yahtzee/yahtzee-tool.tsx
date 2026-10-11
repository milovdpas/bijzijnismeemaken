'use client';

import { useTranslation } from 'react-i18next';

import { PlayerSetup } from '@/components/tools/player-setup';
import { YahtzeeSheetView } from '@/components/tools/yahtzee/yahtzee-sheet';
import { Button } from '@/components/ui/button';
import { useStoredState } from '@/hooks/use-stored-state';
import type { ToolProps } from '@/lib/tools';
import {
    YAHTZEE_MAX_PLAYERS,
    emptyYahtzee,
    parseYahtzeeState,
    setYahtzeePlayers,
    startYahtzee,
} from '@/lib/tools/yahtzee';

/** The Yahtzee sheet: choose who plays, then fill in the boxes. */
export function YahtzeeTool({ groupId, storageKey }: ToolProps) {
    const { t } = useTranslation();
    const [state, update] = useStoredState(storageKey, parseYahtzeeState, emptyYahtzee);

    if (state.phase === 'playing') return <YahtzeeSheetView state={state} update={update} />;

    return (
        <div className="space-y-6">
            <PlayerSetup
                groupId={groupId}
                players={state.players}
                max={YAHTZEE_MAX_PLAYERS}
                ordered
                onChange={(players) => update((current) => setYahtzeePlayers(current, players))}
            />
            <div className="flex justify-end">
                <Button
                    size="lg"
                    disabled={state.players.length === 0}
                    onClick={() => update(startYahtzee)}
                >
                    {t('tools.start')}
                </Button>
            </div>
        </div>
    );
}
