'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { TournamentForm } from '@/components/tournaments/tournament-form';
import { Button } from '@/components/ui/button';
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

/** New or edit, decided by whether a `tournamentId` is given. Success opens the tournament. */
export function TournamentFormView({
    groupId,
    tournamentId,
}: {
    groupId: string;
    tournamentId?: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const create = useCreateTournament(groupId);
    const update = useUpdateTournament(groupId, tournamentId ?? '');
    const existing = useTournament(groupId, tournamentId ?? '');
    const editing = tournamentId !== undefined;
    const listHref = `/groups/${groupId}/tournaments`;
    const back = editing ? `${listHref}/${tournamentId}` : listHref;

    if (editing && existing.isError) {
        return <FormMessage tone="error">{t(errorKey(existing.error))}</FormMessage>;
    }
    if (editing && existing.data === undefined) {
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
            create.mutate(toTournamentInput(form, null), {
                onSuccess: (tournament) => open(tournament.id),
            });
        }
    };
    const mutation = editing ? update : create;

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl">
                    {editing ? t('tournamentForm.editTitle') : t('tournamentForm.newTitle')}
                </h2>
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
                        : blankTournamentForm
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
