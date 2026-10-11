'use client';

import type { TournamentEntryDto, TournamentGroupDto } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * One group's table, in the API's order (points, difference, scored, the
 * match between them, seed). The places that go through to the knockout
 * are marked; won, drawn and lost only show from a tablet up.
 */
export function GroupTable({
    group,
    entries,
    myEntryIds,
}: {
    group: TournamentGroupDto;
    entries: ReadonlyMap<string, TournamentEntryDto>;
    myEntryIds: ReadonlySet<string>;
}) {
    const { t } = useTranslation();
    const column = (key: string, wide = false) => (
        <th
            scope="col"
            title={t(`tournamentPlay.table.${key}Long`)}
            className={cn('w-9 py-1 text-right font-semibold', wide && 'hidden sm:table-cell')}
        >
            {t(`tournamentPlay.table.${key}`)}
        </th>
    );

    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="w-7 py-1 text-left font-semibold">
                        #
                    </th>
                    <th scope="col" className="py-1 text-left font-semibold">
                        {t('tournamentPlay.table.entry')}
                    </th>
                    {column('played')}
                    {column('won', true)}
                    {column('drawn', true)}
                    {column('lost', true)}
                    {column('difference')}
                    {column('points')}
                </tr>
            </thead>
            <tbody>
                {group.standings.map((row) => (
                    <tr
                        key={row.entryId}
                        className={cn('border-t tabular-nums', row.qualifies && 'bg-brand/15')}
                    >
                        <td className="py-1.5 pl-1 text-xs font-bold">{row.rank}</td>
                        <td className="max-w-0 py-1.5">
                            <span
                                className={cn(
                                    'block truncate',
                                    myEntryIds.has(row.entryId) ? 'font-bold' : 'font-semibold',
                                )}
                            >
                                {entries.get(row.entryId)?.name ?? ''}
                            </span>
                        </td>
                        <td className="text-right">{row.played}</td>
                        <td className="hidden text-right sm:table-cell">{row.won}</td>
                        <td className="hidden text-right sm:table-cell">{row.drawn}</td>
                        <td className="hidden text-right sm:table-cell">{row.lost}</td>
                        <td className="text-right">
                            {row.difference > 0 ? `+${String(row.difference)}` : row.difference}
                        </td>
                        <td className="pr-1 text-right font-bold">{row.points}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
