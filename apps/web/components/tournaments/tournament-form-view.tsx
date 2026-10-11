'use client';

import { TOURNAMENT } from '@bzim/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { TournamentForm } from '@/components/tournaments/tournament-form';
import { Button } from '@/components/ui/button';
import { useActivity } from '@/hooks/queries/use-activities';
import {
    useCreateTournament,
    useTournament,
    useUpdateTournament,
} from '@/hooks/queries/use-tournaments';
import { errorKey } from '@/lib/api/errors';
import {
    blankTournamentForm,
    settingsLocked,
    toTournamentInput,
    toTournamentPatch,
    tournamentToForm,
} from '@/lib/tournament-form';
import type { TournamentFormState } from '@/lib/tournament-form';
import { tournamentErrorKey } from '@/lib/tournament-rounds';

/**
 * New or edit, decided by whether a `tournamentId` is given. A new one can
 * come from a tournament activity (`activityId`): it starts with the
 * activity's name and is linked to it. Success opens the tournament.
 */
export function TournamentFormView({
    groupId,
    tournamentId,
    activityId,
}: {
    groupId: string;
    tournamentId?: string;
    activityId?: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const create = useCreateTournament(groupId);
    const update = useUpdateTournament(groupId, tournamentId ?? '');
    const existing = useTournament(groupId, tournamentId ?? '');
    const activity = useActivity(groupId, activityId ?? '');
    const editing = tournamentId !== undefined;
    const listHref = `/groups/${groupId}/tournaments`;
    const back = editing
        ? `${listHref}/${tournamentId}`
        : activityId !== undefined
          ? `/groups/${groupId}/activities/${activityId}`
          : listHref;

    if (editing && existing.isError) {
        return <FormMessage tone="error">{t(errorKey(existing.error))}</FormMessage>;
    }
    if (
        (editing && existing.data === undefined) ||
        (activityId !== undefined && activity.isPending)
    ) {
        return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
    }

    const locked = existing.data !== undefined && settingsLocked(existing.data);
    const open = (id: string) => router.push(`${listHref}/${id}`);
    const submit = (form: TournamentFormState) => {
        if (editing) {
            update.mutate(toTournamentPatch(form, locked), {
                onSuccess: (tournament) => open(tournament.id),
            });
        } else {
            create.mutate(toTournamentInput(form, activityId ?? null), {
                onSuccess: (tournament) => open(tournament.id),
            });
        }
    };
    const mutation = editing ? update : create;

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl">
                        {editing ? t('tournamentForm.editTitle') : t('tournamentForm.newTitle')}
                    </h2>
                    {!editing && activity.data !== undefined && (
                        <p className="truncate text-xs text-muted-foreground">
                            {t('tournamentDetail.activity', { title: activity.data.title })}
                        </p>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={back} />}
                >
                    <ArrowLeft />
                    {t('common.cancel')}
                </Button>
            </div>
            <TournamentForm
                key={editing ? existing.data?.id : 'new'}
                initial={
                    existing.data !== undefined
                        ? tournamentToForm(existing.data)
                        : {
                              ...blankTournamentForm,
                              name: activity.data?.title.slice(0, TOURNAMENT.NAME_MAX_LENGTH) ?? '',
                          }
                }
                locked={locked}
                submitLabel={editing ? t('common.save') : t('tournamentForm.create')}
                pending={mutation.isPending}
                error={mutation.isError ? t(tournamentErrorKey(mutation.error)) : null}
                onSubmit={submit}
            />
        </div>
    );
}
