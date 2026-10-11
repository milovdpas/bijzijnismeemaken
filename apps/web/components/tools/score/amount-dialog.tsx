'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { PillGroup } from '@/components/common/pill-group';
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
import { Input } from '@/components/ui/input';
import type { ToolPlayer } from '@/lib/tools/players';
import { parseAmount } from '@/lib/tools/score';

const SIGNS = ['add', 'subtract'] as const;
const QUICK = [5, 10, 20, 50, 100];

/**
 * Points for one player: a number, then add or subtract (a phone's number
 * pad has no minus). The same dialog corrects an earlier entry or deletes
 * it. Mounted only while open, so it starts fresh each time.
 */
export function AmountDialog({
    player,
    initial,
    onOpenChange,
    onSave,
    onDelete,
}: {
    player: ToolPlayer;
    /** The entry being corrected, signed; null for a new one. */
    initial: number | null;
    onOpenChange: (open: boolean) => void;
    onSave: (amount: number) => void;
    onDelete?: () => void;
}) {
    const { t } = useTranslation();
    const [sign, setSign] = useState<(typeof SIGNS)[number]>(
        initial !== null && initial < 0 ? 'subtract' : 'add',
    );
    const [text, setText] = useState(initial === null ? '' : String(Math.abs(initial)));
    const parsed = parseAmount(text);

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlayerAvatar player={player} />
                        {player.name}
                    </DialogTitle>
                    <DialogDescription>
                        {initial === null ? t('tools.score.addHelp') : t('tools.score.correctHelp')}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (typeof parsed === 'number') onSave(sign === 'add' ? parsed : -parsed);
                    }}
                >
                    <PillGroup
                        options={SIGNS}
                        value={sign}
                        labelFor={(option) => t(`tools.score.${option}`)}
                        onChange={setSign}
                        ariaLabel={t('tools.score.sign')}
                    />
                    <Field
                        label={t('tools.score.points')}
                        error={parsed === undefined ? t('tools.score.invalid') : null}
                    >
                        <Input
                            autoFocus
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="text-lg tabular-nums"
                        />
                    </Field>
                    <div className="flex flex-wrap gap-1.5">
                        {QUICK.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setText(String(value))}
                                className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums transition-colors hover:text-foreground"
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        {onDelete !== undefined && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="sm:mr-auto"
                                onClick={onDelete}
                            >
                                <Trash2 />
                                {t('tools.score.deleteEntry')}
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={typeof parsed !== 'number'}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
