import { Avatar } from '@/components/common/avatar';
import type { ToolPlayer } from '@/lib/tools/players';
import { cn } from '@/lib/utils';

const SIZES = {
    sm: 'size-8 rounded-lg text-sm',
    md: 'size-10 rounded-xl text-base',
};

/** A player's tile: a member's own avatar, or the first letter of a guest's name. */
export function PlayerAvatar({
    player,
    size = 'sm',
    gold = false,
    className,
}: {
    player: ToolPlayer;
    size?: keyof typeof SIZES;
    gold?: boolean;
    className?: string;
}) {
    if (player.avatarKey !== null) {
        return (
            <Avatar avatarKey={player.avatarKey} size={size} gold={gold} className={className} />
        );
    }
    return (
        <span
            aria-hidden="true"
            className={cn(
                'inline-flex shrink-0 items-center justify-center bg-muted font-bold text-ink',
                SIZES[size],
                gold && 'ring-2 ring-amber-400/80',
                className,
            )}
        >
            {Array.from(player.name)[0]?.toUpperCase()}
        </span>
    );
}
