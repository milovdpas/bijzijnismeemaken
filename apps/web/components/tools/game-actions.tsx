'use client';

import { Flag, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Way = 'end' | 'cancel';

/**
 * The two ways out of a game in progress, each asked first: end it now (the
 * scores as they stand decide) or cancel it (the scores go, the players
 * stay). Shared by every tool so they read the same; a tool's own buttons
 * for the running game go in front.
 */
export function GameActions({
    onEnd,
    onCancel,
    canEnd = true,
    children,
    className,
}: {
    onEnd: () => void;
    onCancel: () => void;
    canEnd?: boolean;
    children?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    // Kept apart from `open`, so the text does not change while the dialog closes.
    const [way, setWay] = useState<Way>('end');
    const ask = (next: Way) => {
        setWay(next);
        setOpen(true);
    };

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {children}
            <Button variant="outline" size="sm" disabled={!canEnd} onClick={() => ask('end')}>
                <Flag />
                {t('tools.endGame')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => ask('cancel')}>
                <X />
                {t('tools.cancelGame')}
            </Button>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title={way === 'end' ? t('tools.endGameTitle') : t('tools.cancelGameTitle')}
                description={
                    way === 'end' ? t('tools.endGameDescription') : t('tools.cancelGameDescription')
                }
                confirmLabel={way === 'end' ? t('tools.endGame') : t('tools.cancelGame')}
                destructive={way === 'cancel'}
                onConfirm={() => {
                    if (way === 'end') onEnd();
                    else onCancel();
                    setOpen(false);
                }}
            />
        </div>
    );
}
