'use client';

import type { LeaderboardInput } from '@bzim/types';
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
import { useMembers } from '@/hooks/queries/use-members';
import { errorKey, validationProblem } from '@/lib/api/errors';
import { blankLeaderboardForm, leaderboardToForm } from '@/lib/leaderboard-form';

/** The sentence for whatever the API refused, by its rule name when it gave one. */
function problemKey(error: unknown): string {
    const problem = validationProblem(error);
    return problem === null ? errorKey(error) : `leaderboardForm.problems.${problem}`;
}

/** New or edit, decided by whether a `leaderboardId` is given. Success opens the board. */
export function LeaderboardFormView({
    groupId,
    leaderboardId,
}: {
    groupId: string;
    leaderboardId?: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const members = useMembers(groupId);
    const create = useCreateLeaderboard(groupId);
    const update = useUpdateLeaderboard(groupId, leaderboardId ?? '');
    const existing = useLeaderboard(groupId, leaderboardId ?? '');
    const editing = leaderboardId !== undefined;
    const listHref = `/groups/${groupId}/leaderboards`;
    const back = editing ? `${listHref}/${leaderboardId}` : listHref;

    if (editing && existing.isError) {
        return <FormMessage tone="error">{t(errorKey(existing.error))}</FormMessage>;
    }
    if ((editing && existing.data === undefined) || members.data === undefined) {
        return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
    }

    const open = (id: string) => router.push(`${listHref}/${id}`);
    const submit = (input: LeaderboardInput) => {
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
                        : blankLeaderboardForm
                }
                members={members.data}
                submitLabel={editing ? t('common.save') : t('leaderboardForm.create')}
                pending={mutation.isPending}
                error={mutation.isError ? t(problemKey(mutation.error)) : null}
                onSubmit={submit}
            />
        </div>
    );
}
