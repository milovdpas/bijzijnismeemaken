import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as notionists from '@dicebear/notionists';
import * as openPeeps from '@dicebear/open-peeps';
import * as pixelArt from '@dicebear/pixel-art';
import * as thumbs from '@dicebear/thumbs';
import { parseAvatarKey } from '@bzim/types';
import type { AvatarStyle } from '@bzim/types';

/**
 * The DiceBear styles, drawn here on the server so their artwork (hundreds of
 * kilobytes) never ships in the app's JavaScript. All CC0 1.0: no credit. One
 * function per style, because each style types its own options.
 */
const DRAW: Record<AvatarStyle, (seed: string) => string> = {
    lorelei: (seed) => createAvatar(lorelei, { seed }).toString(),
    notionists: (seed) => createAvatar(notionists, { seed }).toString(),
    'open-peeps': (seed) => createAvatar(openPeeps, { seed }).toString(),
    'pixel-art': (seed) => createAvatar(pixelArt, { seed }).toString(),
    thumbs: (seed) => createAvatar(thumbs, { seed }).toString(),
};

/**
 * A generated avatar as an SVG. The same style and seed always draw the same
 * face, so the browser and the service worker may keep it for good. The
 * policy header keeps the image inert even when it is opened on its own.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ style: string; seed: string }> },
): Promise<Response> {
    const { style, seed } = await params;
    const avatar = parseAvatarKey(`${style}:${seed}`);
    if (avatar?.kind !== 'generated') {
        return new Response('Not found', { status: 404 });
    }
    return new Response(DRAW[avatar.style](avatar.seed), {
        headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
