'use client';

import { AVATAR_KEYS } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { cn } from '@/lib/utils';

/**
 * The sixteen avatars as a radio group.
 *
 * A wrapping row of fixed-size cells rather than a stretched grid, so the gap
 * between tiles is the same on every width. The selection ring sits on a
 * padded cell with the same rounding as the tile, so it reads as a frame
 * around the avatar rather than a box behind it.
 */
export function AvatarPicker({
    value,
    onChange,
    className,
}: {
    value: AvatarKey | null;
    onChange: (key: AvatarKey) => void;
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <div
            role="radiogroup"
            aria-label={t('profile.avatar')}
            className={cn('flex flex-wrap gap-3', className)}
        >
            {AVATAR_KEYS.map((key) => {
                const selected = value === key;
                return (
                    <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={t(`avatars.${key}`)}
                        onClick={() => onChange(key)}
                        className={cn(
                            'rounded-[1.6rem] p-1.5 transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            selected
                                ? 'bg-brand/15 ring-3 ring-brand'
                                : 'opacity-75 hover:bg-accent hover:opacity-100',
                        )}
                    >
                        <Avatar avatarKey={key} size="lg" />
                    </button>
                );
            })}
        </div>
    );
}
