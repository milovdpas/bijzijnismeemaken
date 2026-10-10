'use client';

import type { AvatarKey } from '@bzim/types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { avatarPages } from '@/lib/avatars';
import { cn } from '@/lib/utils';

/**
 * The avatars as pages of sixteen, four by four, that swipe sideways like
 * the app pages on a phone, with dots underneath. Scroll snapping does the
 * paging; the dots follow the scroll position and jump to a page on tap.
 * One radio group across all pages, so the selection is still one choice.
 * Each page has a little padding so the selection ring, which sits outside
 * the button, is not clipped by the scroller nor seen on the next page.
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
    const pages = avatarPages();
    const scroller = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(0);

    const onScroll = () => {
        const node = scroller.current;
        if (node === null) return;
        setPage(Math.round(node.scrollLeft / node.clientWidth));
    };
    const goTo = (index: number) => {
        const node = scroller.current;
        if (node === null) return;
        node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
    };

    return (
        <div className={cn('grid gap-3', className)}>
            <div
                ref={scroller}
                role="radiogroup"
                aria-label={t('profile.avatar')}
                onScroll={onScroll}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            >
                {pages.map((keys, index) => (
                    <div
                        key={index}
                        className="grid w-full shrink-0 snap-start grid-cols-4 justify-items-center gap-2 p-1"
                    >
                        {keys.map((key) => {
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
                ))}
            </div>
            {pages.length > 1 && (
                <div className="flex justify-center gap-1.5" aria-hidden>
                    {pages.map((_keys, index) => (
                        <button
                            key={index}
                            type="button"
                            tabIndex={-1}
                            onClick={() => goTo(index)}
                            className={cn(
                                'size-2 rounded-full transition-colors',
                                index === page ? 'bg-ink' : 'bg-muted-foreground/40',
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
