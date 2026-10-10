import type { SVGProps } from 'react';

/**
 * The avatar drawings Lucide does not have, in Lucide's own idiom (24-unit
 * box, stroke 2, round caps and joins, no fill) so they sit in the same set
 * without looking borrowed. They take the same props as a Lucide icon.
 */
function frame({ strokeWidth = 2, ...props }: SVGProps<SVGSVGElement>) {
    return {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
        ...props,
    };
}

/** A monkey face: round head, two big ears, a muzzle. */
export function MonkeyIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...frame(props)}>
            <circle cx="12" cy="12" r="7" />
            <path d="M5.5 10a2.5 2.5 0 1 0 0 4" />
            <path d="M18.5 10a2.5 2.5 0 1 1 0 4" />
            <path d="M9.5 10.5h.01" />
            <path d="M14.5 10.5h.01" />
            <path d="M9 15.5c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5" />
            <path d="M9 14a3 3 0 0 1 6 0" />
        </svg>
    );
}

/** A butterfly: body in the middle, two wing lobes a side. */
export function ButterflyIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...frame(props)}>
            <path d="M12 7v12" />
            <path d="M12 7c-1-2-2.5-3-4-3" />
            <path d="M12 7c1-2 2.5-3 4-3" />
            <path d="M12 9c-2-3-6-3.5-8-1.5s0 5 3.5 5.5C9.5 13.3 11 12 12 11" />
            <path d="M12 9c2-3 6-3.5 8-1.5s0 5-3.5 5.5C14.5 13.3 13 12 12 11" />
            <path d="M12 12c-1.5-.5-4 .5-5 2.5s1 4.5 3 3.5 2-2.5 2-4" />
            <path d="M12 12c1.5-.5 4 .5 5 2.5s-1 4.5-3 3.5-2-2.5-2-4" />
        </svg>
    );
}

/** A ladybird: round body, a line down the back, spots, a little head. */
export function LadybirdIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...frame(props)}>
            <path d="M12 6a8 8 0 0 1 8 8 8 8 0 0 1-16 0 8 8 0 0 1 8-8Z" />
            <path d="M12 6v16" />
            <path d="M9 4.5 7.5 3" />
            <path d="M15 4.5 16.5 3" />
            <path d="M9 11h.01" />
            <path d="M15 11h.01" />
            <path d="M8.5 16h.01" />
            <path d="M15.5 16h.01" />
        </svg>
    );
}

/** A football: a circle with the pentagon and its spokes. */
export function FootballIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg {...frame(props)}>
            <circle cx="12" cy="12" r="9" />
            <path d="m12 8 3.5 2.6-1.3 4.2h-4.4l-1.3-4.2L12 8Z" />
            <path d="M12 8V3.5" />
            <path d="m15.5 10.6 4.1-1.4" />
            <path d="m14.2 14.8 2.6 3.6" />
            <path d="m9.8 14.8-2.6 3.6" />
            <path d="M8.5 10.6 4.4 9.2" />
        </svg>
    );
}
