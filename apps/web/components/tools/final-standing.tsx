import { PlayerAvatar } from '@/components/tools/player-avatar';
import type { RankedPlayer } from '@/lib/tools/players';
import { cn } from '@/lib/utils';

/** The final standing of an ended game: place, player and score, the winners in gold. */
export function FinalStanding({
    rows,
    format,
    highlight,
}: {
    rows: RankedPlayer[];
    format: (value: number) => string;
    /** False when the game ended without a winner, so nobody is gold. */
    highlight: boolean;
}) {
    return (
        <ol className="divide-y rounded-2xl border bg-card">
            {rows.map(({ player, value, rank }) => (
                <li key={player.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span
                        className={cn(
                            'w-6 shrink-0 text-center text-sm font-bold tabular-nums',
                            highlight && rank === 1 ? 'text-ink' : 'text-muted-foreground',
                        )}
                    >
                        {rank}
                    </span>
                    <PlayerAvatar player={player} gold={highlight && rank === 1} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {player.name}
                    </span>
                    <span className="shrink-0 text-lg font-extrabold text-ink tabular-nums">
                        {format(value)}
                    </span>
                </li>
            ))}
        </ol>
    );
}
