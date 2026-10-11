'use client';

import { ParticipantMode, TOURNAMENT } from '@bzim/types';
import type { AvatarKey, TournamentDetailDto, TournamentEntryInput } from '@bzim/types';
import { Plus, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { PersonAvatar } from '@/components/tournaments/person-avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMembers } from '@/hooks/queries/use-members';
import { useAddEntry } from '@/hooks/queries/use-tournaments';
import { playingUserIds, teamNameFor } from '@/lib/tournament-draft';
import { tournamentErrorKey } from '@/lib/tournament-rounds';

/** Somebody picked for the team being built: a member by id, or a guest by name. */
interface TeamPick {
    userId: string | null;
    name: string;
    avatarKey: AvatarKey | null;
}

/**
 * Adding to a draft. With players, tapping a member adds them at once and a
 * name adds a guest; the dialog stays open for the next. With teams, the
 * people go into a team first (up to the team size, members and guests
 * alike), which is then added under its own name or its people's. One
 * person alone is a team of one: that is how the people for random teams
 * are gathered.
 */
export function AddEntryDialog({
    groupId,
    tournament,
    open,
    onOpenChange,
}: {
    groupId: string;
    tournament: TournamentDetailDto;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation();
    const members = useMembers(groupId);
    const add = useAddEntry(groupId, tournament.id);
    const [guestName, setGuestName] = useState('');
    const [team, setTeam] = useState<TeamPick[]>([]);
    const [teamName, setTeamName] = useState('');
    const [failure, setFailure] = useState<unknown>(null);

    const teams = tournament.participantMode === ParticipantMode.TEAMS;
    const size = tournament.teamSize ?? 1;
    const full = teams && team.length >= size;
    const taken = new Set([
        ...playingUserIds(tournament.entries),
        ...team.flatMap((pick) => (pick.userId === null ? [] : [pick.userId])),
    ]);
    const candidates = (members.data ?? []).filter((member) => !taken.has(member.user.id));

    const send = (input: TournamentEntryInput, after: () => void) =>
        add.mutate(input, {
            onSuccess: () => {
                setFailure(null);
                after();
            },
            onError: setFailure,
        });
    const pickMember = (pick: TeamPick & { userId: string }) => {
        if (teams) setTeam((current) => [...current, pick]);
        else send({ userId: pick.userId }, () => undefined);
    };
    const addGuest = () => {
        const name = guestName.trim();
        if (name === '' || full) return;
        if (teams) {
            setTeam((current) => [...current, { userId: null, name, avatarKey: null }]);
            setGuestName('');
        } else {
            send({ name }, () => setGuestName(''));
        }
    };
    const addTeam = () => {
        const name = teamName.trim();
        send(
            {
                ...(name === '' ? {} : { name }),
                members: team.map((pick) =>
                    pick.userId === null ? { name: pick.name } : { userId: pick.userId },
                ),
            },
            () => {
                setTeam([]);
                setTeamName('');
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {teams ? t('entryDialog.teamTitle') : t('entryDialog.playerTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {teams ? t('entryDialog.teamHelp', { size }) : t('entryDialog.playerHelp')}
                    </DialogDescription>
                </DialogHeader>

                {teams && (
                    <section className="space-y-2 rounded-xl border p-3">
                        <h3 className="text-xs font-semibold text-muted-foreground">
                            {t('entryDialog.team', { picked: team.length, size })}
                        </h3>
                        {team.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('entryDialog.teamEmpty')}
                            </p>
                        ) : (
                            <ul className="flex flex-wrap gap-2">
                                {team.map((pick, index) => (
                                    <li
                                        key={`${pick.userId ?? pick.name}-${String(index)}`}
                                        className="flex items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-0.5 text-sm"
                                    >
                                        <PersonAvatar
                                            avatarKey={pick.avatarKey}
                                            className="size-6"
                                        />
                                        <span className="font-semibold">{pick.name}</span>
                                        <Button
                                            size="icon-xs"
                                            variant="ghost"
                                            aria-label={t('entryDialog.takeOut', {
                                                name: pick.name,
                                            })}
                                            onClick={() =>
                                                setTeam((current) =>
                                                    current.filter((_, i) => i !== index),
                                                )
                                            }
                                        >
                                            <X />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Input
                                className="min-w-40 flex-1"
                                value={teamName}
                                maxLength={TOURNAMENT.ENTRY_NAME_MAX_LENGTH}
                                placeholder={
                                    team.length === 0
                                        ? t('entryDialog.teamName')
                                        : teamNameFor(team.map((pick) => pick.name))
                                }
                                aria-label={t('entryDialog.teamName')}
                                onChange={(event) => setTeamName(event.target.value)}
                            />
                            <Button disabled={team.length === 0 || add.isPending} onClick={addTeam}>
                                <Plus />
                                {t('entryDialog.addTeam')}
                            </Button>
                        </div>
                    </section>
                )}

                <section className="space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                        {t('entryDialog.fromGroup')}
                    </h3>
                    {members.data === undefined ? (
                        <div className="h-10 animate-pulse rounded-xl bg-muted" />
                    ) : candidates.length === 0 ? (
                        <p className="py-1 text-sm text-muted-foreground">
                            {t('entryDialog.everyoneIn')}
                        </p>
                    ) : (
                        <ul>
                            {candidates.map((member) => (
                                <li key={member.user.id}>
                                    <button
                                        type="button"
                                        disabled={full || add.isPending}
                                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent disabled:opacity-50"
                                        onClick={() =>
                                            pickMember({
                                                userId: member.user.id,
                                                name: member.user.displayName,
                                                avatarKey: member.user.avatarKey,
                                            })
                                        }
                                    >
                                        <PersonAvatar avatarKey={member.user.avatarKey} />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {member.user.displayName}
                                        </span>
                                        <Plus className="size-4 text-muted-foreground" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <form
                    className="space-y-2 border-t pt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        addGuest();
                    }}
                >
                    <h3 className="text-xs font-semibold text-muted-foreground">
                        {t('entryDialog.guest')}
                    </h3>
                    <div className="flex gap-2">
                        <Input
                            value={guestName}
                            maxLength={TOURNAMENT.GUEST_NAME_MAX_LENGTH}
                            placeholder={t('entryDialog.guestName')}
                            aria-label={t('entryDialog.guestName')}
                            onChange={(event) => setGuestName(event.target.value)}
                        />
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={guestName.trim() === '' || full || add.isPending}
                        >
                            <UserPlus />
                            {t('entryDialog.add')}
                        </Button>
                    </div>
                </form>

                {failure !== null && (
                    <FormMessage tone="error">{t(tournamentErrorKey(failure))}</FormMessage>
                )}
            </DialogContent>
        </Dialog>
    );
}
