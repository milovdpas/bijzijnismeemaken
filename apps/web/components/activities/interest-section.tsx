'use client';

import type { ActivityDetailDto } from '@bzim/types';
import { Check, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useSetInterest } from '@/hooks/queries/use-activities';
import { useMembers } from '@/hooks/queries/use-members';
import { errorKey } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

/**
 * Who is in. The caller's own button is the big one; admins also get a sheet
 * with every member and a switch each, for marking people who said yes in
 * person but never opened the app.
 */
export function InterestSection({
    groupId,
    activity,
    isAdmin,
}: {
    groupId: string;
    activity: ActivityDetailDto;
    isAdmin: boolean;
}) {
    const { t } = useTranslation();
    const set = useSetInterest(groupId, activity.id);
    const members = useMembers(groupId);
    const [managing, setManaging] = useState(false);
    const inIds = new Set(activity.interests.map((user) => user.id));

    return (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base">
                    <Users className="size-4 text-muted-foreground" />
                    {t('activityDetail.inTitle', { count: activity.interestCount })}
                </h2>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
                            <UserPlus />
                            {t('activityDetail.markOthers')}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant={activity.iAmIn ? 'secondary' : 'default'}
                        disabled={set.isPending}
                        onClick={() => set.mutate({ userId: null, inFor: !activity.iAmIn })}
                    >
                        {activity.iAmIn ? <Check /> : null}
                        {activity.iAmIn ? t('activityDetail.imIn') : t('activityDetail.countMeIn')}
                    </Button>
                </div>
            </div>

            {activity.interests.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {activity.interests.map((user) => (
                        <li
                            key={user.id}
                            className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm"
                        >
                            <Avatar avatarKey={user.avatarKey} size="sm" />
                            {user.displayName}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">{t('activityDetail.nobodyYet')}</p>
            )}
            {set.isError && <FormMessage tone="error">{t(errorKey(set.error))}</FormMessage>}

            {isAdmin && (
                <Sheet open={managing} onOpenChange={setManaging}>
                    <SheetContent
                        side="bottom"
                        className="max-h-[80dvh] overflow-y-auto rounded-t-2xl"
                    >
                        <SheetHeader>
                            <SheetTitle>{t('activityDetail.markOthers')}</SheetTitle>
                            <SheetDescription>
                                {t('activityDetail.markOthersHelp')}
                            </SheetDescription>
                        </SheetHeader>
                        <ul className="divide-y px-4 pb-6">
                            {(members.data ?? []).map((member) => {
                                const inFor = inIds.has(member.user.id);
                                return (
                                    <li
                                        key={member.user.id}
                                        className={cn(
                                            'flex items-center gap-3 py-2.5',
                                            set.isPending && 'opacity-60',
                                        )}
                                    >
                                        <Avatar avatarKey={member.user.avatarKey} size="sm" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {member.user.displayName}
                                        </span>
                                        <Switch
                                            checked={inFor}
                                            disabled={set.isPending}
                                            aria-label={member.user.displayName}
                                            onCheckedChange={(next) =>
                                                set.mutate({ userId: member.user.id, inFor: next })
                                            }
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    </SheetContent>
                </Sheet>
            )}
        </section>
    );
}
