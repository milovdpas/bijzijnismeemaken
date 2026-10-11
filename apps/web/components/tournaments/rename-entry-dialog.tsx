'use client';

import { TOURNAMENT } from '@bzim/types';
import type { TournamentEntryDto } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/** A team's name. Mount it with the entry as `key`, so the field starts from that entry's name. */
export function RenameEntryDialog({
    entry,
    pending,
    error,
    onOpenChange,
    onSubmit,
}: {
    entry: TournamentEntryDto | null;
    pending: boolean;
    error: string | null;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string) => void;
}) {
    const { t } = useTranslation();
    const [name, setName] = useState(entry?.name ?? '');
    const canSave = name.trim().length > 0 && !pending;

    return (
        <Dialog open={entry !== null} onOpenChange={onOpenChange}>
            <DialogContent>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSave) onSubmit(name.trim());
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('tournamentDraft.renameTitle')}</DialogTitle>
                    </DialogHeader>
                    <Input
                        autoFocus
                        value={name}
                        maxLength={TOURNAMENT.ENTRY_NAME_MAX_LENGTH}
                        aria-label={t('tournamentDraft.renameTitle')}
                        onChange={(event) => setName(event.target.value)}
                    />
                    {error !== null && <FormMessage tone="error">{error}</FormMessage>}
                    <DialogFooter>
                        <Button type="submit" disabled={!canSave}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
