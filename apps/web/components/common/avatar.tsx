import type { AvatarKey } from '@bzim/types';

import { AVATARS } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const SIZES = {
    sm: 'size-8 rounded-lg [&_svg]:size-4',
    md: 'size-10 rounded-xl [&_svg]:size-5',
    lg: 'size-16 rounded-2xl [&_svg]:size-8',
    xl: 'size-24 rounded-3xl [&_svg]:size-12',
};

/** A person's avatar tile. Pure, so it works in server components too. */
export function Avatar({
    avatarKey,
    size = 'md',
    className,
}: {
    avatarKey: AvatarKey;
    size?: keyof typeof SIZES;
    className?: string;
}) {
    const { icon: Icon, tile } = AVATARS[avatarKey];

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center text-ink',
                SIZES[size],
                className,
            )}
            style={{ backgroundColor: tile, color: 'oklch(0.27 0.07 262)' }}
            aria-hidden
        >
            <Icon strokeWidth={2.25} />
        </span>
    );
}
