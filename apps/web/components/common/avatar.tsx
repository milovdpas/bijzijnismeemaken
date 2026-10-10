import type { AvatarKey } from '@bzim/types';

import { AVATARS } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const SIZES = {
    sm: 'size-8 rounded-lg [&_svg]:size-4',
    md: 'size-10 rounded-xl [&_svg]:size-5',
    lg: 'size-16 rounded-2xl [&_svg]:size-8',
    xl: 'size-24 rounded-3xl [&_svg]:size-12',
};

/** A person's avatar tile. Pure, so it works in server components too. `gold` is for a number one. */
export function Avatar({
    avatarKey,
    size = 'md',
    gold = false,
    className,
}: {
    avatarKey: AvatarKey;
    size?: keyof typeof SIZES;
    gold?: boolean;
    className?: string;
}) {
    const { icon: Icon, tile } = AVATARS[avatarKey];

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center text-ink',
                SIZES[size],
                gold && 'ring-2 ring-amber-400/80 shadow-[0_0_0_3px_rgba(245,197,24,0.25)]',
                className,
            )}
            style={{
                background: gold
                    ? 'linear-gradient(135deg, oklch(0.93 0.12 95), oklch(0.8 0.16 80) 60%, oklch(0.7 0.15 70))'
                    : tile,
                color: 'oklch(0.27 0.07 262)',
            }}
            aria-hidden
        >
            <Icon strokeWidth={2.25} />
        </span>
    );
}
