'use client';

import { ParticipantMode, TournamentFormat } from '@bzim/types';
import type { TournamentDetailDto, TournamentEntryDto } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { EntryChip } from '@/components/tournaments/entry-chip';
import { PreviewBracket } from '@/components/tournaments/preview-bracket';
import { PreviewGroups } from '@/components/tournaments/preview-groups';
import { RenameEntryDialog } from '@/components/tournaments/rename-entry-dialog';
import { Button } from '@/components/ui/button';
import { useRemoveEntry, useSwapEntries, useUpdateEntry } from '@/hooks/queries/use-tournaments';
import { bySeed, groupPatch } from '@/lib/tournament-draft';
import { entryIndex, tournamentErrorKey } from '@/lib/tournament-rounds';

/**
 * The draft as it will be played: the knockout's bracket, or the groups.
 * The organiser swaps two entries by dragging one onto the other on a
 * desktop, or by tapping one and then the other, which also works on a
 * phone and from the keyboard; a picked entry gets its rename and remove
 * buttons. Every change is one request, and the screen redraws from the
 * answer, so it always shows what the server holds.
 */
export function DraftPreview({
    groupId,
    tournament,
}: {
    groupId: string;
    tournament: TournamentDetailDto;
}) {
    const { t } = useTranslation();
    const swap = useSwapEntries(groupId, tournament.id);
    const update = useUpdateEntry(groupId, tournament.id);
    const remove = useRemoveEntry(groupId, tournament.id);
    const [picked, setPicked] = useState<TournamentEntryDto | null>(null);
    const [dragging, setDragging] = useState<TournamentEntryDto | null>(null);
    const [renaming, setRenaming] = useState<TournamentEntryDto | null>(null);
    const [removing, setRemoving] = useState<TournamentEntryDto | null>(null);
    const [failure, setFailure] = useState<unknown>(null);

    const manage = tournament.canManage;
    const teams = tournament.participantMode === ParticipantMode.TEAMS;
    const groups = tournament.format === TournamentFormat.GROUPS_KNOCKOUT;
    const busy = swap.isPending || update.isPending || remove.isPending;
    const entries = entryIndex(tournament.entries);
    const done = { onSuccess: () => setFailure(null), onError: setFailure };

    const swapWith = (entry: TournamentEntryDto, other: TournamentEntryDto) => {
        setPicked(null);
        if (entry.id !== other.id) {
            swap.mutate({ entryId: entry.id, withEntryId: other.id }, done);
        }
    };
    const moveTo = (entry: TournamentEntryDto, groupNo: number) => {
        setPicked(null);
        setDragging(null);
        const patch = groupPatch(entry, groupNo);
        if (patch !== null) update.mutate({ entryId: entry.id, patch }, done);
    };
    const tap = (entry: TournamentEntryDto) => {
        if (busy) return;
        if (picked === null) setPicked(entry);
        else if (picked.id === entry.id) setPicked(null);
        else swapWith(picked, entry);
    };

    const chip = (entryId: string, movable: boolean) => {
        const entry = entries.get(entryId);
        if (entry === undefined) return null;
        const interactive = manage && movable;
        return (
            <EntryChip
                key={entry.id}
                entry={entry}
                teams={teams}
                interactive={interactive}
                picked={picked?.id === entry.id}
                dragging={dragging?.id === entry.id}
                onTap={() => tap(entry)}
                drag={
                    interactive
                        ? {
                              draggable: true,
                              onDragStart: (event) => {
                                  // Firefox only starts a drag that carries data.
                                  event.dataTransfer.setData('text/plain', entry.name);
                                  event.dataTransfer.effectAllowed = 'move';
                                  setDragging(entry);
                              },
                              onDragOver: (event) => {
                                  if (dragging !== null) event.preventDefault();
                              },
                              onDrop: (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (dragging !== null) swapWith(dragging, entry);
                                  setDragging(null);
                              },
                              onDragEnd: () => setDragging(null),
                          }
                        : {}
                }
            />
        );
    };

    if (tournament.entries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {manage ? t('tournamentDraft.emptyManager') : t('tournamentDraft.empty')}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {manage && (
                <p className="text-xs text-muted-foreground">
                    {groups
                        ? t('tournamentDraft.previewHelpGroups')
                        : t('tournamentDraft.previewHelpKnockout')}
                </p>
            )}
            {picked !== null && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand/15 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                        {t(groups ? 'tournamentDraft.pickedGroups' : 'tournamentDraft.picked', {
                            name: picked.name,
                        })}
                    </span>
                    {teams && (
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                                update.reset();
                                setRenaming(picked);
                            }}
                        >
                            {t('tournamentDraft.renameAction')}
                        </Button>
                    )}
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                            remove.reset();
                            setRemoving(picked);
                        }}
                    >
                        {t('tournamentDraft.removeAction')}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setPicked(null)}>
                        {t('common.cancel')}
                    </Button>
                </div>
            )}

            {groups ? (
                <PreviewGroups
                    tournament={tournament}
                    picked={picked}
                    dragging={dragging}
                    chip={chip}
                    onMove={moveTo}
                />
            ) : tournament.preview.length > 0 ? (
                <PreviewBracket preview={tournament.preview} chip={chip} />
            ) : (
                <div className="space-y-1">
                    {bySeed(tournament.entries).map((entry) => chip(entry.id, true))}
                    <p className="text-xs text-muted-foreground">
                        {t('tournamentDraft.previewSoon')}
                    </p>
                </div>
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
                        {
                            onSuccess: () => {
                                setRenaming(null);
                                setPicked(null);
                            },
                        },
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
                    remove.mutate(removing.id, {
                        onSuccess: () => {
                            setRemoving(null);
                            setPicked(null);
                        },
                    });
                }}
            />
        </div>
    );
}
