'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { PillGroup } from '@/components/common/pill-group';
import { PlayerSetup } from '@/components/tools/player-setup';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { StoredUpdate } from '@/hooks/use-stored-state';
import {
    DARTS_MAX_PLAYERS,
    X01_STARTS,
    setDartsPlayers,
    setDartsSettings,
    startGame,
} from '@/lib/tools/darts';
import type { DartsMode, DartsState } from '@/lib/tools/darts';

const MODES: readonly DartsMode[] = ['x01', 'clock'];
const STARTS = X01_STARTS.map(String);

/** Who throws, in which order, and which game. */
export function DartsSetup({
    groupId,
    state,
    update,
}: {
    groupId: string;
    state: DartsState;
    update: StoredUpdate<DartsState>;
}) {
    const { t } = useTranslation();
    const { settings } = state;

    return (
        <div className="space-y-6">
            <PlayerSetup
                groupId={groupId}
                players={state.players}
                max={DARTS_MAX_PLAYERS}
                ordered
                onChange={(players) => update((current) => setDartsPlayers(current, players))}
            />

            <section className="space-y-3">
                <h3 className="text-sm font-bold">{t('tools.darts.game')}</h3>
                <PillGroup
                    options={MODES}
                    value={settings.mode}
                    labelFor={(mode) => t(`tools.darts.modes.${mode}`)}
                    onChange={(mode) => update((current) => setDartsSettings(current, { mode }))}
                    ariaLabel={t('tools.darts.game')}
                />
                {settings.mode === 'x01' ? (
                    <>
                        <PillGroup
                            options={STARTS}
                            value={String(settings.start)}
                            labelFor={(start) => start}
                            onChange={(text) => {
                                const start = X01_STARTS.find((value) => String(value) === text);
                                if (start !== undefined) {
                                    update((current) => setDartsSettings(current, { start }));
                                }
                            }}
                            ariaLabel={t('tools.darts.startScore')}
                        />
                        <ToggleRow
                            checked={settings.doubleOut}
                            label={t('tools.darts.doubleOut')}
                            help={t('tools.darts.doubleOutHelp')}
                            onChange={(doubleOut) =>
                                update((current) => setDartsSettings(current, { doubleOut }))
                            }
                        />
                    </>
                ) : (
                    <ToggleRow
                        checked={settings.clockBull}
                        label={t('tools.darts.clockBull')}
                        help={t('tools.darts.clockBullHelp')}
                        onChange={(clockBull) =>
                            update((current) => setDartsSettings(current, { clockBull }))
                        }
                    />
                )}
            </section>

            <div className="flex justify-end">
                <Button
                    size="lg"
                    disabled={state.players.length === 0}
                    onClick={() => update(startGame)}
                >
                    {t('tools.start')}
                </Button>
            </div>
        </div>
    );
}

function ToggleRow({
    checked,
    label,
    help,
    onChange,
}: {
    checked: boolean;
    label: string;
    help: string;
    onChange: (checked: boolean) => void;
}) {
    const id = useId();
    return (
        <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
            <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
            <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{help}</span>
            </span>
        </label>
    );
}
