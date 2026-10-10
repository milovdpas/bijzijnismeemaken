'use client';

import { ERROR_CODES, GroupRole } from '@bzim/types';
import { ArrowLeft, Pencil, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityFacts } from '@/components/activities/activity-facts';
import { ImageCredit } from '@/components/common/image-credit';
import { InterestSection } from '@/components/activities/interest-section';
import { OccurrencesSection } from '@/components/activities/occurrences-section';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActivity, useDeleteActivity } from '@/hooks/queries/use-activities';
import { useGroup } from '@/hooks/queries/use-groups';
import { useMe } from '@/hooks/queries/use-me';
import { CATEGORY_ICONS } from '@/lib/activity-categories';
import { errorKey, isApiError } from '@/lib/api/errors';

/**
 * One activity: picture, facts, who is in, when it happens. The creator and
 * the admins also get edit, delete and the planning controls.
 */
export function ActivityDetailView({
    groupId,
    activityId,
}: {
    groupId: string;
    activityId: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const me = useMe();
    const group = useGroup(groupId);
    const activity = useActivity(groupId, activityId);
    const remove = useDeleteActivity(groupId);
    const [deleting, setDeleting] = useState(false);
    const [imageBroken, setImageBroken] = useState(false);
    const listHref = `/groups/${groupId}/activities`;

    if (isApiError(activity.error, ERROR_CODES.NOT_FOUND)) {
        return (
            <EmptyState
                icon={Sparkles}
                titleKey="activityDetail.notFoundTitle"
                descriptionKey="activityDetail.notFoundDescription"
                action={
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={listHref} />}
                    >
                        <ArrowLeft className="size-4" />
                        {t('activityDetail.backToList')}
                    </Button>
                }
            />
        );
    }
    if (activity.isError) {
        return <FormMessage tone="error">{t(errorKey(activity.error))}</FormMessage>;
    }
    if (activity.data === undefined || group.data === undefined) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
                <div className="h-40 animate-pulse rounded-2xl bg-muted" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            </div>
        );
    }

    const data = activity.data;
    const role = group.data.role;
    const isAdmin = role === GroupRole.OWNER || role === GroupRole.ADMIN;
    const canManage = isAdmin || (me.data !== undefined && data.creator?.id === me.data.id);
    const Icon = CATEGORY_ICONS[data.category];
    const image = data.imageUrl !== null && !imageBroken ? data.imageUrl : null;

    return (
        <div className="space-y-4">
            <Link
                href={listHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                {t('activityDetail.backToList')}
            </Link>

            <header className="overflow-hidden rounded-2xl border bg-card">
                {image !== null && (
                    /* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host; next/image needs a fixed allow-list */
                    <img
                        src={image}
                        alt=""
                        className="aspect-[2/1] w-full object-cover"
                        onError={() => setImageBroken(true)}
                    />
                )}
                <div className="space-y-3 p-4">
                    {image !== null && data.imageCreditName !== null && (
                        <ImageCredit
                            credit={{ name: data.imageCreditName, url: data.imageCreditUrl ?? '' }}
                        />
                    )}
                    <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                            <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl md:text-2xl">{data.title}</h2>
                                <Badge variant="secondary">{t(`labels.${data.label}`)}</Badge>
                                <Badge variant="outline">{t(`categories.${data.category}`)}</Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {t('activityDetail.by', {
                                    name: data.creatorName ?? t('activityDetail.unknownCreator'),
                                })}
                            </p>
                        </div>
                        {canManage && (
                            <div className="flex shrink-0 gap-1">
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={t('activities.edit')}
                                    nativeButton={false}
                                    render={<Link href={`${listHref}/${activityId}/edit`} />}
                                >
                                    <Pencil />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={t('activityDetail.delete')}
                                    onClick={() => setDeleting(true)}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        )}
                    </div>
                    {data.description !== null && (
                        <p className="text-sm whitespace-pre-line">{data.description}</p>
                    )}
                    <ActivityFacts activity={data} />
                </div>
            </header>

            <InterestSection groupId={groupId} activity={data} isAdmin={isAdmin} />
            <OccurrencesSection groupId={groupId} activity={data} canManage={canManage} />

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title={t('activityDetail.delete')}
                description={t('activityDetail.deleteDescription', { title: data.title })}
                confirmLabel={t('activityDetail.delete')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() =>
                    remove.mutate(activityId, { onSuccess: () => router.push(listHref) })
                }
            />
        </div>
    );
}
