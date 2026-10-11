'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import { Button } from '@/components/ui/button';
import { useActivityTournaments } from '@/hooks/queries/use-tournaments';
import { errorKey } from '@/lib/api/errors';

/**
 * On a tournament activity: the tournaments made from it, and a way to make
 * one. The form opens with the activity's name and links the two.
 */
export function ActivityTournaments({
    groupId,
    activityId,
}: {
    groupId: string;
    activityId: string;
}) {
    const { t } = useTranslation();
    const tournaments = useActivityTournaments(groupId, activityId);
    const listHref = `/groups/${groupId}/tournaments`;

    return (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base">{t('activityDetail.tournamentsTitle')}</h2>
                <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`${listHref}/new?activityId=${activityId}`} />}
                >
                    <Plus />
                    {t('activityDetail.createTournament')}
                </Button>
            </div>
            {tournaments.isPending && <div className="h-20 animate-pulse rounded-2xl bg-muted" />}
            {tournaments.isError && (
                <FormMessage tone="error">{t(errorKey(tournaments.error))}</FormMessage>
            )}
            {tournaments.data !== undefined &&
                (tournaments.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('activityDetail.tournamentsEmpty')}
                    </p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {tournaments.data.map((tournament) => (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                href={`${listHref}/${tournament.id}`}
                            />
                        ))}
                    </div>
                ))}
        </section>
    );
}
