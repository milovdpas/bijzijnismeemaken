'use client';

import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
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
import { choicesFor, isValidScore } from '@/lib/tools/yahtzee';
import type { YahtzeeCategory } from '@/lib/tools/yahtzee';
import { cn } from '@/lib/utils';

/**
 * One box for one player. A box with a few possible scores shows them as
 * buttons (one tap saves); a dice total is typed. A filled box can be
 * cleared, which is how a mistake is put right.
 */
export function YahtzeeCellDialog({
    player,
    category,
    current,
    onOpenChange,
    onSave,
}: {
    player: ToolPlayer;
    category: YahtzeeCategory;
    current: number | null;
    onOpenChange: (open: boolean) => void;
    onSave: (value: number | null) => void;
}) {
    const { t } = useTranslation();
    const formId = useId();
    const choices = choicesFor(category);
    const [text, setText] = useState(current === null ? '' : String(current));
    const trimmed = text.trim();
    const typed = /^\d{1,2}$/.test(trimmed) ? Number(trimmed) : null;
    const valid = typed !== null && isValidScore(category, typed);
    const label = t(`tools.yahtzee.categories.${category}`);

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlayerAvatar player={player} />
                        {t('tools.yahtzee.cellTitle', { category: label, name: player.name })}
                    </DialogTitle>
                    <DialogDescription>
                        {choices !== null
                            ? t('tools.yahtzee.choiceHelp')
                            : category === 'chance'
                              ? t('tools.yahtzee.chanceHelp')
                              : t('tools.yahtzee.sumHelp')}
                    </DialogDescription>
                </DialogHeader>
                {choices !== null ? (
                    <div className="grid grid-cols-3 gap-2">
                        {choices.map((choice) => (
                            <Button
                                key={choice}
                                variant="outline"
                                onClick={() => onSave(choice)}
                                className={cn(
                                    'h-12 text-lg font-bold tabular-nums',
                                    choice === current && 'border-ink bg-accent',
                                )}
                            >
                                {choice}
                            </Button>
                        ))}
                    </div>
                ) : (
                    <form
                        id={formId}
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (valid) onSave(typed);
                        }}
                    >
                        <Field
                            label={label}
                            error={trimmed !== '' && !valid ? t('tools.yahtzee.invalidSum') : null}
                        >
                            <Input
                                autoFocus
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                className="text-lg tabular-nums"
                            />
                        </Field>
                    </form>
                )}
                <DialogFooter>
                    {current !== null && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="sm:mr-auto"
                            onClick={() => onSave(null)}
                        >
                            {t('tools.yahtzee.clear')}
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    {choices === null && (
                        <Button type="submit" form={formId} disabled={!valid}>
                            {t('common.save')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
