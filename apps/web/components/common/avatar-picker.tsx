'use client';

import { AVATAR_STYLES, generatedAvatarKey, parseAvatarKey } from '@bzim/types';
import type { AvatarKey, AvatarStyle } from '@bzim/types';
import { Shuffle } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { PillGroup } from '@/components/common/pill-group';
import { Button } from '@/components/ui/button';
import { avatarPages, candidateSeeds, randomRound } from '@/lib/avatars';
import { cn } from '@/lib/utils';

type PickerTab = 'icons' | AvatarStyle;

const TABS: readonly PickerTab[] = ['icons', ...AVATAR_STYLES];
const FACES_PER_PAGE = 12;

/** One avatar to choose, ringed when it is the chosen one. */
function Choice({
    avatarKey,
    selected,
    label,
    onChange,
}: {
    avatarKey: AvatarKey;
    selected: boolean;
    label: string;
    onChange: (key: AvatarKey) => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => onChange(avatarKey)}
            className={cn(
                'rounded-[1.6rem] p-1.5 transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                selected
                    ? 'bg-brand/15 ring-3 ring-brand'
                    : 'opacity-75 hover:bg-accent hover:opacity-100',
            )}
        >
            <Avatar avatarKey={avatarKey} size="lg" />
        </button>
    );
}

/**
 * The icons as pages of sixteen, four by four, that swipe sideways like the
 * app pages on a phone, with dots underneath. Scroll snapping does the
 * paging; the dots follow the scroll position and jump to a page on tap.
 * Each page has a little padding so the selection ring, which sits outside
 * the button, is not clipped by the scroller nor seen on the next page.
 */
function IconPages({
    value,
    onChange,
}: {
    value: AvatarKey | null;
    onChange: (key: AvatarKey) => void;
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
        <>
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
                        {keys.map((key) => (
                            <Choice
                                key={key}
                                avatarKey={key}
                                selected={value === key}
                                label={t(`avatars.${key}`)}
                                onChange={onChange}
                            />
                        ))}
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
        </>
    );
}

/**
 * Faces of one DiceBear style, a page at a time, and a button for another
 * page. The chosen face stays first while its style is open, so shuffling
 * never hides what is picked.
 */
function GeneratedFaces({
    style,
    value,
    onChange,
}: {
    style: AvatarStyle;
    value: AvatarKey | null;
    onChange: (key: AvatarKey) => void;
}) {
    const { t } = useTranslation();
    const [round, setRound] = useState(0);
    const chosen = value === null ? null : parseAvatarKey(value);
    const page = candidateSeeds(round, FACES_PER_PAGE);
    const seeds =
        chosen?.kind === 'generated' && chosen.style === style && !page.includes(chosen.seed)
            ? [chosen.seed, ...page.slice(0, FACES_PER_PAGE - 1)]
            : page;

    return (
        <>
            <div
                role="radiogroup"
                aria-label={t('profile.avatar')}
                className="grid grid-cols-4 justify-items-center gap-2 p-1"
            >
                {seeds.map((seed, index) => {
                    const key = generatedAvatarKey(style, seed);
                    return (
                        <Choice
                            key={seed}
                            avatarKey={key}
                            selected={value === key}
                            label={t('avatarPicker.face', { number: index + 1 })}
                            onChange={onChange}
                        />
                    );
                })}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-center"
                onClick={() => setRound(randomRound())}
            >
                <Shuffle />
                {t('avatarPicker.shuffle')}
            </Button>
        </>
    );
}

/**
 * The avatar choice: the built-in icons, or a face from one of the
 * generated styles. One radio group per view, and the style row on top
 * opens where the current avatar lives.
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
    const current = value === null ? null : parseAvatarKey(value);
    const [tab, setTab] = useState<PickerTab>(
        current?.kind === 'generated' ? current.style : 'icons',
    );

    return (
        <div className={cn('grid gap-3', className)}>
            <PillGroup
                options={TABS}
                value={tab}
                labelFor={(option) => t(`avatarStyles.${option}`)}
                ariaLabel={t('avatarPicker.style')}
                onChange={setTab}
            />
            {tab === 'icons' ? (
                <IconPages value={value} onChange={onChange} />
            ) : (
                <GeneratedFaces key={tab} style={tab} value={value} onChange={onChange} />
            )}
        </div>
    );
}
