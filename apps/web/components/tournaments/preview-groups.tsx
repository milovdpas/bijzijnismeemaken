'use client';

import type { TournamentDetailDto, TournamentEntryDto } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { draftGroups } from '@/lib/tournament-draft';
import { cn } from '@/lib/utils';

/**
 * A group-stage draft: a card per group with its entries by seed. Entries
 * swap with each other like in the bracket; to go into a group without
 * swapping (an emptier one) an entry is dropped on the card, or picked and
 * sent with the card's button.
 */
export function PreviewGroups({
    tournament,
    picked,
    dragging,
    chip,
    onMove,
}: {
    tournament: TournamentDetailDto;
    picked: TournamentEntryDto | null;
    dragging: TournamentEntryDto | null;
    chip: (entryId: string, movable: boolean) => React.ReactNode;
    onMove: (entry: TournamentEntryDto, groupNo: number) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="grid gap-3 md:grid-cols-2">
            {draftGroups(tournament).map((group) => (
                <section
                    key={group.groupNo}
                    className={cn(
                        'rounded-xl border p-1.5',
                        dragging !== null &&
                            dragging.groupNo !== group.groupNo &&
                            'border-dashed border-ink/40',
                    )}
                    onDragOver={(event) => {
                        if (dragging !== null) event.preventDefault();
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        if (dragging !== null) onMove(dragging, group.groupNo);
                    }}
                >
                    <div className="flex min-h-7 items-center justify-between gap-2 px-1.5">
                        <h4 className="text-sm font-bold">
                            {t('tournamentDraft.group', { number: group.groupNo })}
                        </h4>
                        {picked !== null && picked.groupNo !== group.groupNo && (
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => onMove(picked, group.groupNo)}
                            >
                                {t('tournamentDraft.moveHere')}
                            </Button>
                        )}
                    </div>
                    {group.entries.length === 0 ? (
                        <p className="px-1.5 py-2 text-xs text-muted-foreground">
                            {t('tournamentDraft.groupEmpty')}
                        </p>
                    ) : (
                        <div className="space-y-0.5">
                            {group.entries.map((entry) => chip(entry.id, true))}
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}
