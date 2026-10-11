'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerAvatar } from '@/components/tools/player-avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ToolPlayer } from '@/lib/tools/players';
import { MAX_EXTRA_YAHTZEES, YAHTZEE_BONUS } from '@/lib/tools/yahtzee';

/**
 * How many extra Yahtzees a player threw, counted up and down, with the
 * joker rule in a sentence: the extra Yahtzee still fills a box.
 */
export function YahtzeeBonusDialog({
    player,
    current,
    onOpenChange,
    onSave,
}: {
    player: ToolPlayer;
    current: number;
    onOpenChange: (open: boolean) => void;
    onSave: (count: number) => void;
}) {
    const { t } = useTranslation();
    const [count, setCount] = useState(current);

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlayerAvatar player={player} />
                        {t('tools.yahtzee.bonusTitle', { name: player.name })}
                    </DialogTitle>
                    <DialogDescription>{t('tools.yahtzee.bonusHelp')}</DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center gap-5 py-2">
                    <Button
                        size="icon-lg"
                        variant="outline"
                        aria-label={t('tools.yahtzee.bonusLess')}
                        disabled={count === 0}
                        onClick={() => setCount((value) => value - 1)}
                    >
                        <Minus />
                    </Button>
                    <div className="min-w-24 text-center">
                        <p className="text-4xl font-extrabold text-ink tabular-nums">{count}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {t('tools.yahtzee.bonusPoints', { points: count * YAHTZEE_BONUS })}
                        </p>
                    </div>
                    <Button
                        size="icon-lg"
                        variant="outline"
                        aria-label={t('tools.yahtzee.bonusMore')}
                        disabled={count >= MAX_EXTRA_YAHTZEES}
                        onClick={() => setCount((value) => value + 1)}
                    >
                        <Plus />
                    </Button>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="button" onClick={() => onSave(count)}>
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
