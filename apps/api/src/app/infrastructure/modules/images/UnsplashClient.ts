import { IMAGES, Locale } from '@bzim/types';
import type { ImageResultDto, ImageSearchResponse } from '@bzim/types';

import { env } from '../../../../config/app';

/** The part of Unsplash's search answer this app reads. */
interface UnsplashPhoto {
    id: string;
    width: number;
    height: number;
    alt_description: string | null;
    urls: { regular: string; small: string };
    links: { download_location: string };
    user: { name: string; links: { html: string } };
}

interface UnsplashSearchResponse {
    results: UnsplashPhoto[];
    total_pages: number;
}

const API = 'https://api.unsplash.com';
/** Unsplash wants to know where the traffic comes from, on every link back to them. */
const REFERRAL = 'utm_source=bij_zijn_is_meemaken&utm_medium=referral';

/**
 * Unsplash photo search, behind the API so the key never reaches a browser.
 * Static with two methods, so a test replaces them with `vi.spyOn`.
 *
 * Their terms, honoured here: hotlink the URLs they return (never copy the
 * files), credit the photographer with links carrying the referral tag, and
 * hit `download_location` when a photo is actually used.
 */
export class UnsplashClient {
    static configured(): boolean {
        return env.images.unsplashAccessKey() !== '';
    }

    static async search(query: string, page: number, locale: Locale): Promise<ImageSearchResponse> {
        const params = new URLSearchParams({
            query,
            page: String(page),
            per_page: String(IMAGES.PER_PAGE),
            lang: locale,
            content_filter: 'high',
        });
        const response = await fetch(`${API}/search/photos?${params.toString()}`, {
            headers: UnsplashClient.headers(),
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) {
            throw new Error(`Unsplash answered ${String(response.status)}`);
        }
        const body = (await response.json()) as UnsplashSearchResponse;
        return {
            items: body.results.map((photo) => UnsplashClient.toDto(photo)),
            hasMore: page < body.total_pages,
        };
    }

    /** The "download" ping Unsplash requires; its answer is of no interest. */
    static async markUsed(useToken: string): Promise<void> {
        const response = await fetch(useToken, {
            headers: UnsplashClient.headers(),
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) {
            throw new Error(`Unsplash answered ${String(response.status)}`);
        }
    }

    /** Only a download location on Unsplash's own API may be pinged with our key. */
    static isUseToken(value: string): boolean {
        return value.startsWith(`${API}/photos/`) && value.includes('/download');
    }

    private static headers(): Record<string, string> {
        return {
            Authorization: `Client-ID ${env.images.unsplashAccessKey()}`,
            'Accept-Version': 'v1',
        };
    }

    private static toDto(photo: UnsplashPhoto): ImageResultDto {
        return {
            id: photo.id,
            useToken: photo.links.download_location,
            url: photo.urls.regular,
            previewUrl: photo.urls.small,
            width: photo.width,
            height: photo.height,
            alt: photo.alt_description ?? '',
            photographer: photo.user.name,
            photographerUrl: `${photo.user.links.html}?${REFERRAL}`,
        };
    }
}
