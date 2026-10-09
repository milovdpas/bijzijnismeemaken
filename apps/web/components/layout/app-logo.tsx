import { cn } from '@/lib/utils';

/**
 * The badge: two friends on a yellow tile. Same artwork as `app/icon.svg`, so
 * the favicon, the top bar and later the manifest icons are one drawing.
 *
 * Drawn in tokens rather than hex so it follows the theme: in dark mode the
 * tile stays yellow and the figures go to the dark ink, which is the point of
 * having `--brand-foreground`.
 */
export function AppLogo({
    size = 'md',
    className,
}: {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const sizes = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-xl', lg: 'size-16 rounded-2xl' };

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center bg-brand text-brand-foreground',
                sizes[size],
                className,
            )}
            aria-hidden
        >
            <svg
                viewBox="0 0 64 64"
                className="size-[72%]"
                fill="none"
                stroke="currentColor"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="24" cy="24" r="7" />
                <circle cx="42" cy="22" r="5" />
                <path d="M12 50c2-9 7-13 12-13s10 4 12 13" />
                <path d="M38 46c1-6 4-9 8-9 3 0 6 2 8 6" />
            </svg>
        </span>
    );
}
