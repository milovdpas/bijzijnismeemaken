'use client';

import { useTranslation } from 'react-i18next';

import type { ToolPlayer } from '@/lib/tools/players';

/**
 * The end of a game: the winner, a tie, or that it ended without one, and
 * then the way on. The buttons are the tool's own.
 */
export function GameResult({
    winners,
    detail,
    children,
}: {
    winners: ToolPlayer[];
    /** What the winner scored, under the name. */
    detail?: string;
    children: React.ReactNode;
}) {
    const { t, i18n } = useTranslation();
    const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
        winners.map((winner) => winner.name),
    );
    const title =
        winners.length === 0
            ? t('tools.result.none')
            : winners.length === 1
              ? t('tools.result.winner', { name: names })
              : t('tools.result.tie', { names });

    return (
        <section
            aria-live="polite"
            className="space-y-3 rounded-2xl border-2 border-brand bg-brand/15 p-4 text-center"
        >
            <div>
                <p className="text-lg font-extrabold text-ink">{title}</p>
                {winners.length > 0 && detail !== undefined && (
                    <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>
                )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">{children}</div>
        </section>
    );
}
