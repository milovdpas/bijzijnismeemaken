'use client';

import { ParticipantMode, TournamentFormat } from '@bzim/types';
import type { TournamentDetailDto, TournamentEntryDto, TournamentEntryPatch } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { EntryRow } from '@/components/tournaments/entry-row';
import { RenameEntryDialog } from '@/components/tournaments/rename-entry-dialog';
import { useRemoveEntry, useUpdateEntry } from '@/hooks/queries/use-tournaments';
import { bySeed, draftGroups, dropPatch, groupPatch, stepPatch } from '@/lib/tournament-draft';
import { tournamentErrorKey } from '@/lib/tournament-rounds';
import { cn } from '@/lib/utils';

/**
 * The entries of a draft in the order of the draw, or per group in a group
 * stage. Every move is one request; the list redraws from the answer, so
 * what is shown is always what the server holds.
 */
export function DraftEntries({
    groupId,
    tournament,
}: {
    groupId: string;
    tournament: TournamentDetailDto;
}) {
    const { t } = useTranslation();
    const update = useUpdateEntry(groupId, tournament.id);
    const remove = useRemoveEntry(groupId, tournament.id);
    const [dragging, setDragging] = useState<TournamentEntryDto | null>(null);
    const [renaming, setRenaming] = useState<TournamentEntryDto | null>(null);
    const [removing, setRemoving] = useState<TournamentEntryDto | null>(null);
    const [failure, setFailure] = useState<unknown>(null);
    const manage = tournament.canManage;
    const busy = update.isPending || remove.isPending;

    const change = (entry: TournamentEntryDto, patch: TournamentEntryPatch | null) => {
        if (patch === null) return;
        update.mutate(
            { entryId: entry.id, patch },
            { onSuccess: () => setFailure(null), onError: setFailure },
        );
    };
    const allowDrop = (event: React.DragEvent) => {
        if (dragging !== null) event.preventDefault();
    };

    const list = (entries: TournamentEntryDto[]) => (
        <ol className="divide-y">
            {entries.map((entry, index) => (
                <EntryRow
                    key={entry.id}
                    entry={entry}
                    teams={tournament.participantMode === ParticipantMode.TEAMS}
                    manage={manage}
                    groupCount={
                        tournament.format === TournamentFormat.GROUPS_KNOCKOUT
                            ? tournament.groupCount
                            : null
                    }
                    canUp={index > 0}
                    canDown={index < entries.length - 1}
                    busy={busy}
                    dragging={dragging?.id === entry.id}
                    drag={
                        manage
                            ? {
                                  draggable: true,
                                  onDragStart: () => setDragging(entry),
                                  onDragOver: allowDrop,
                                  onDrop: (event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (dragging !== null)
                                          change(dragging, dropPatch(dragging, entry));
                                      setDragging(null);
                                  },
                                  onDragEnd: () => setDragging(null),
                              }
                            : {}
                    }
                    onUp={() => change(entry, stepPatch(entries, entry.id, -1))}
                    onDown={() => change(entry, stepPatch(entries, entry.id, 1))}
                    onGroup={(groupNo) => change(entry, groupPatch(entry, groupNo))}
                    onRename={() => {
                        update.reset();
                        setRenaming(entry);
                    }}
                    onRemove={() => {
                        remove.reset();
                        setRemoving(entry);
                    }}
                />
            ))}
        </ol>
    );

    if (tournament.entries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {manage ? t('tournamentDraft.emptyManager') : t('tournamentDraft.empty')}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {tournament.format === TournamentFormat.GROUPS_KNOCKOUT ? (
                <div className="grid gap-3 md:grid-cols-2">
                    {draftGroups(tournament).map((group) => (
                        <section
                            key={group.groupNo}
                            className={cn(
                                'rounded-xl border px-3 pt-2 pb-1',
                                dragging !== null &&
                                    dragging.groupNo !== group.groupNo &&
                                    'border-dashed border-ink/40',
                            )}
                            onDragOver={allowDrop}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (dragging !== null)
                                    change(dragging, groupPatch(dragging, group.groupNo));
                                setDragging(null);
                            }}
                        >
                            <h4 className="text-sm font-bold">
                                {t('tournamentDraft.group', { number: group.groupNo })}
                            </h4>
                            {group.entries.length === 0 ? (
                                <p className="py-3 text-xs text-muted-foreground">
                                    {t('tournamentDraft.groupEmpty')}
                                </p>
                            ) : (
                                list(group.entries)
                            )}
                        </section>
                    ))}
                </div>
            ) : (
                list(bySeed(tournament.entries))
            )}

            {failure !== null && (
                <FormMessage tone="error">{t(tournamentErrorKey(failure))}</FormMessage>
            )}

            <RenameEntryDialog
                key={renaming?.id ?? 'none'}
                entry={renaming}
                pending={update.isPending}
                error={update.isError ? t(tournamentErrorKey(update.error)) : null}
                onOpenChange={(open) => {
                    if (!open) setRenaming(null);
                }}
                onSubmit={(name) => {
                    if (renaming === null) return;
                    update.mutate(
                        { entryId: renaming.id, patch: { name } },
                        { onSuccess: () => setRenaming(null) },
                    );
                }}
            />
            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null);
                }}
                title={t('tournamentDraft.removeTitle')}
                description={t('tournamentDraft.removeDescription', { name: removing?.name ?? '' })}
                confirmLabel={t('tournamentDraft.removeConfirm')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(tournamentErrorKey(remove.error)) : null}
                onConfirm={() => {
                    if (removing === null) return;
                    remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
                }}
            />
        </div>
    );
}
