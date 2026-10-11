import { AVATAR_KEYS, parseAvatarKey } from '@bzim/types';
import type { AvatarKey, ParsedAvatar } from '@bzim/types';

import { AVATARS, avatarTile, generatedAvatarUrl } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const SIZES = {
    sm: 'size-8 rounded-lg [&_svg]:size-4',
    md: 'size-10 rounded-xl [&_svg]:size-5',
    lg: 'size-16 rounded-2xl [&_svg]:size-8',
    xl: 'size-24 rounded-3xl [&_svg]:size-12',
};

const GOLD =
    'linear-gradient(135deg, oklch(0.93 0.12 95), oklch(0.8 0.16 80) 60%, oklch(0.7 0.15 70))';

/** What a key that reads as neither kind falls back to, rather than nothing. */
const FALLBACK: ParsedAvatar = { kind: 'icon', key: AVATAR_KEYS[0] };

/**
 * A person's avatar: an icon on a coloured tile, or a generated face on one
 * (drawn by the app's own route, so no artwork ships in the bundle). Pure,
 * so it works in server components too. `gold` is for a number one.
 */
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
    const avatar = parseAvatarKey(avatarKey) ?? FALLBACK;
    // Clipping makes the box sit on the text baseline, which leaves room for
    // descenders under it inside a button; aligning it to the top does not.
    const frame = cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden align-top text-ink',
        SIZES[size],
        gold && 'ring-2 ring-amber-400/80 shadow-[0_0_0_3px_rgba(245,197,24,0.25)]',
        className,
    );
    const background = gold ? GOLD : avatarTile(avatar);

    if (avatar.kind === 'generated') {
        return (
            <span className={frame} style={{ background }} aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element -- our own SVG route; next/image would only re-encode a vector */}
                <img
                    src={generatedAvatarUrl(avatar.style, avatar.seed)}
                    alt=""
                    className="size-full"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                />
            </span>
        );
    }

    const Icon = AVATARS[avatar.key].icon;
    return (
        <span className={frame} style={{ background, color: 'oklch(0.27 0.07 262)' }} aria-hidden>
            <Icon strokeWidth={2.25} />
        </span>
    );
}
