import type { AvatarKey } from '@bzim/types';
import { UserRound } from 'lucide-react';

import { Avatar } from '@/components/common/avatar';
import { cn } from '@/lib/utils';

/** A member's avatar, or a plain tile for a guest, who has none. */
export function PersonAvatar({
    avatarKey,
    className,
}: {
    avatarKey: AvatarKey | null;
    className?: string;
}) {
    if (avatarKey !== null) return <Avatar avatarKey={avatarKey} size="sm" className={className} />;
    return (
        <span
            className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4',
                className,
            )}
            aria-hidden
        >
            <UserRound />
        </span>
    );
}
