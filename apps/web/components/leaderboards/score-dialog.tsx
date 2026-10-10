'use client';

import { ScoreType } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
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
import { parseScore, scoreToInput } from '@/lib/score-input';

/**
 * One person's score for the current period, typed as points or as a time.
 * The caller owns the request and knows who the person is; this parses,
 * explains a bad entry, and offers to clear an existing score.
 */
export function ScoreDialog({
    name,
    avatarKey,
    scoreType,
    current,
    initial = current,
    open,
    onOpenChange,
    pending,
    error,
    onSubmit,
}: {
    name: string;
    avatarKey: AvatarKey;
    scoreType: ScoreType;
    /** The person's score in this period, or null when they have none yet. */
    current: number | null;
    /** What the input starts with; the current score unless something else was measured. */
    initial?: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pending: boolean;
    error: string | null;
    onSubmit: (score: number | null) => void;
}) {
    const { t } = useTranslation();
    const [text, setText] = useState(() => scoreToInput(initial, scoreType));
    const parsed = parseScore(text, scoreType);
    const invalid = parsed === undefined;
    const canSave = !invalid && parsed !== null && !pending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Avatar avatarKey={avatarKey} size="sm" />
                        {name}
                    </DialogTitle>
                    <DialogDescription>
                        {scoreType === ScoreType.TIME
                            ? t('ranking.enterTimeHelp')
                            : t('ranking.enterPointsHelp')}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSave) onSubmit(parsed);
                    }}
                >
                    <Field
                        label={
                            scoreType === ScoreType.TIME ? t('ranking.time') : t('ranking.points')
                        }
                        error={invalid ? t('ranking.invalid') : null}
                    >
                        <Input
                            autoFocus
                            inputMode="decimal"
                            placeholder={scoreType === ScoreType.TIME ? '1:23.450' : '0'}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="text-lg tabular-nums"
                        />
                    </Field>
                    {error !== null && <FormMessage tone="error">{error}</FormMessage>}
                    <DialogFooter>
                        {current !== null && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => onSubmit(null)}
                                className="sm:mr-auto"
                            >
                                {t('ranking.clear')}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={() => onOpenChange(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={!canSave}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
