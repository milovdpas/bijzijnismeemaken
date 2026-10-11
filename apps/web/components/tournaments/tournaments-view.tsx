'use client';

import { Archive, Medal, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { PillGroup } from '@/components/common/pill-group';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import { Button } from '@/components/ui/button';
import { useTournaments } from '@/hooks/queries/use-tournaments';
import { errorKey } from '@/lib/api/errors';

const SCOPES = ['current', 'archive'] as const;

/** The group's tournaments: what is on now (running first, then drafts), or the archive. */
export function TournamentsView({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const [scope, setScope] = useState<(typeof SCOPES)[number]>('current');
    const archive = scope === 'archive';
    const tournaments = useTournaments(groupId, archive);
    const listHref = `/groups/${groupId}/tournaments`;
    const newButton = (
        <Button nativeButton={false} render={<Link href={`${listHref}/new`} />}>
            <Plus className="size-4" />
            {t('tournaments.new')}
        </Button>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <PillGroup
                    options={SCOPES}
                    value={scope}
                    labelFor={(option) => t(`tournaments.${option}`)}
                    onChange={setScope}
                    ariaLabel={t('groupTabs.tournaments')}
                />
                {newButton}
            </div>

            {tournaments.isPending && (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                </div>
            )}
            {tournaments.isError && (
                <FormMessage tone="error">{t(errorKey(tournaments.error))}</FormMessage>
            )}
            {tournaments.data !== undefined &&
                (tournaments.data.length === 0 ? (
                    archive ? (
                        <EmptyState
                            icon={Archive}
                            titleKey="tournaments.emptyArchiveTitle"
                            descriptionKey="tournaments.emptyArchiveDescription"
                        />
                    ) : (
                        <EmptyState
                            icon={Medal}
                            titleKey="tournaments.emptyTitle"
                            descriptionKey="tournaments.emptyDescription"
                            action={newButton}
                        />
                    )
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
        </div>
    );
}
