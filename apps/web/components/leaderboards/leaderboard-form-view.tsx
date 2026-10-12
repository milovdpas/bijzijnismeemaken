'use client';

import type { CreateLeaderboardInput } from '@bzim/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { LeaderboardForm } from '@/components/leaderboards/leaderboard-form';
import { Button } from '@/components/ui/button';
import {
    useCreateLeaderboard,
    useLeaderboard,
    useUpdateLeaderboard,
} from '@/hooks/queries/use-leaderboards';
import { useMe } from '@/hooks/queries/use-me';
import { useMembers } from '@/hooks/queries/use-members';
import { errorKey, validationProblem } from '@/lib/api/errors';
import {
    blankLeaderboardForm,
    gameBoardForm,
    gameBoardName,
    leaderboardToForm,
} from '@/lib/leaderboard-form';

/** The sentence for whatever the API refused, by its rule name when it gave one. */
function problemKey(error: unknown): string {
    const problem = validationProblem(error);
    return problem === null ? errorKey(error) : `leaderboardForm.problems.${problem}`;
}

/**
 * New or edit, decided by whether a `leaderboardId` is given. Success opens
 * the board, or goes back to `returnTo`. A new board for a game from the
 * tools gets `players`: it starts private, with them on it and their names
 * as its name.
 */
export function LeaderboardFormView({
    groupId,
    leaderboardId,
    players,
    returnTo,
}: {
    groupId: string;
    leaderboardId?: string;
    players?: string[];
    returnTo?: string;
}) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const members = useMembers(groupId);
    const me = useMe();
    const create = useCreateLeaderboard(groupId);
    const update = useUpdateLeaderboard(groupId, leaderboardId ?? '');
    const existing = useLeaderboard(groupId, leaderboardId ?? '');
    const editing = leaderboardId !== undefined;
    const listHref = `/groups/${groupId}/leaderboards`;
    const back = returnTo ?? (editing ? `${listHref}/${leaderboardId}` : listHref);

    if (editing && existing.isError) {
        return <FormMessage tone="error">{t(errorKey(existing.error))}</FormMessage>;
    }
    if (
        (editing && existing.data === undefined) ||
        members.data === undefined ||
        me.data === undefined
    ) {
        return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
    }

    const open = (id: string) => router.push(returnTo ?? `${listHref}/${id}`);
    const submit = (input: CreateLeaderboardInput) => {
        if (editing) {
            update.mutate(input, { onSuccess: (board) => open(board.id) });
        } else {
            create.mutate(input, { onSuccess: (board) => open(board.id) });
        }
    };
    const mutation = editing ? update : create;

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl">
                    {editing ? t('leaderboardForm.editTitle') : t('leaderboardForm.newTitle')}
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
            <LeaderboardForm
                key={editing ? existing.data?.updatedAt : 'new'}
                initial={
                    editing && existing.data !== undefined
                        ? leaderboardToForm(existing.data)
                        : players !== undefined && players.length > 0
                          ? gameBoardForm(
                                players,
                                members.data,
                                me.data.id,
                                gameBoardName(players, t('leaderboardForm.versus'), i18n.language),
                            )
                          : blankLeaderboardForm
                }
                members={members.data}
                meId={me.data.id}
                creating={!editing}
                submitLabel={editing ? t('common.save') : t('leaderboardForm.create')}
                pending={mutation.isPending}
                error={mutation.isError ? t(problemKey(mutation.error)) : null}
                onSubmit={submit}
            />
        </div>
    );
}
