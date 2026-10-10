'use client';

import type { ActivityInput } from '@bzim/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { ActivityForm } from '@/components/activities/activity-form';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { useActivity, useCreateActivity, useUpdateActivity } from '@/hooks/queries/use-activities';
import { errorKey, validationProblem } from '@/lib/api/errors';
import { activityToForm, blankActivityForm } from '@/lib/activity-form';

/** The API's rule problem, if that is what a 422 was about, as the sentence the form uses for it. */
function problemKey(error: unknown): string {
    const problem = validationProblem(error);
    return problem === null ? errorKey(error) : `activityForm.problems.${problem}`;
}

/** New or edit, decided by whether an `activityId` is given. Success opens the activity. */
export function ActivityFormView({
    groupId,
    activityId,
}: {
    groupId: string;
    activityId?: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const create = useCreateActivity(groupId);
    const update = useUpdateActivity(groupId, activityId ?? '');
    const existing = useActivity(groupId, activityId ?? '');
    const editing = activityId !== undefined;

    const back = editing
        ? `/groups/${groupId}/activities/${activityId}`
        : `/groups/${groupId}/activities`;

    if (editing && existing.isError) {
        return <FormMessage tone="error">{t(errorKey(existing.error))}</FormMessage>;
    }
    if (editing && existing.data === undefined) {
        return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
    }

    const submit = (input: ActivityInput) => {
        if (editing) {
            update.mutate(input, {
                onSuccess: (activity) =>
                    router.push(`/groups/${groupId}/activities/${activity.id}`),
            });
        } else {
            create.mutate(input, {
                onSuccess: (activity) =>
                    router.push(`/groups/${groupId}/activities/${activity.id}`),
            });
        }
    };
    const mutation = editing ? update : create;

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl">
                    {editing ? t('activityForm.editTitle') : t('activityForm.newTitle')}
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
            <ActivityForm
                key={editing ? existing.data?.updatedAt : 'new'}
                initial={
                    editing && existing.data !== undefined
                        ? activityToForm(existing.data)
                        : blankActivityForm
                }
                submitLabel={editing ? t('common.save') : t('activityForm.create')}
                pending={mutation.isPending}
                error={mutation.isError ? t(problemKey(mutation.error)) : null}
                onSubmit={submit}
            />
        </div>
    );
}
