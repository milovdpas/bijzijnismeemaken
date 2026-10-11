import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES, Locale } from '@bzim/types';
import type { ImageSearchResponse } from '@bzim/types';

import { UnsplashClient } from '../src/app/infrastructure/modules/images/UnsplashClient';
import { sessionFor } from './support/auth';
import { api, asUser, data, error } from './support/client';
import { seedUser } from './support/factories';

const PHOTO = {
    id: 'abc',
    useToken: 'https://api.unsplash.com/photos/abc/download?ixid=1',
    url: 'https://images.unsplash.com/photo-abc?w=1080',
    previewUrl: 'https://images.unsplash.com/photo-abc?w=400',
    width: 4000,
    height: 3000,
    alt: 'Bowling',
    photographer: 'Someone',
    photographerUrl:
        'https://unsplash.com/@someone?utm_source=bij_zijn_is_meemaken&utm_medium=referral',
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GET /images/search', () => {
    it('proxies the provider in the caller language and never exposes the key', async () => {
        vi.spyOn(UnsplashClient, 'configured').mockReturnValue(true);
        const search = vi
            .spyOn(UnsplashClient, 'search')
            .mockResolvedValue({ items: [PHOTO], hasMore: true });
        const user = await seedUser({ locale: Locale.EN });
        const { accessToken } = await sessionFor(user);

        const response = await asUser(accessToken).get(
            `${API_ENDPOINTS.IMAGES.SEARCH}?q=bowling&page=2`,
        );

        expect(response.status).toBe(200);
        expect(data<ImageSearchResponse>(response)).toEqual({ items: [PHOTO], hasMore: true });
        expect(search).toHaveBeenCalledWith('bowling', 2, Locale.EN);
        expect(JSON.stringify(response.body)).not.toContain('Client-ID');
    });

    it('answers 503 without a key, 502 when the provider fails, and validates the query', async () => {
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);

        vi.spyOn(UnsplashClient, 'configured').mockReturnValue(false);
        const off = await client.get(`${API_ENDPOINTS.IMAGES.SEARCH}?q=bowling`);
        expect(off.status).toBe(503);
        expect(error(off).code).toBe(ERROR_CODES.PROVIDER_ERROR);

        vi.spyOn(UnsplashClient, 'configured').mockReturnValue(true);
        vi.spyOn(UnsplashClient, 'search').mockRejectedValue(new Error('Unsplash answered 403'));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect((await client.get(`${API_ENDPOINTS.IMAGES.SEARCH}?q=bowling`)).status).toBe(502);

        expect((await client.get(`${API_ENDPOINTS.IMAGES.SEARCH}?q=b`)).status).toBe(422);
    });

    it('is for signed-in people', async () => {
        expect((await api.get(`${API_ENDPOINTS.IMAGES.SEARCH}?q=bowling`)).status).toBe(401);
    });
});

describe('POST /images/used', () => {
    it('pings the provider for its own download locations only, and never fails the caller', async () => {
        vi.spyOn(UnsplashClient, 'configured').mockReturnValue(true);
        const ping = vi.spyOn(UnsplashClient, 'markUsed').mockResolvedValue();
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);

        expect(
            (await client.post(API_ENDPOINTS.IMAGES.USED, { useToken: PHOTO.useToken })).status,
        ).toBe(204);
        expect(ping).toHaveBeenCalledWith(PHOTO.useToken);

        expect(
            (await client.post(API_ENDPOINTS.IMAGES.USED, { useToken: 'https://evil.test/x' }))
                .status,
        ).toBe(422);

        ping.mockRejectedValue(new Error('Unsplash answered 500'));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(
            (await client.post(API_ENDPOINTS.IMAGES.USED, { useToken: PHOTO.useToken })).status,
        ).toBe(204);
    });
});
