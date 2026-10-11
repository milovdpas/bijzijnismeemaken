import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, ActivityCategory, DateMode, ERROR_CODES } from '@bzim/types';

import { mailer } from '../src/app/modules/mail';
import { sessionFor } from './support/auth';
import { asUser, error } from './support/client';
import { seedGroup, seedUser } from './support/factories';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('the ceiling on things that notify a whole group', () => {
    it('lets a person create sixty activities an hour, then asks them to wait', async () => {
        vi.spyOn(mailer, 'send').mockResolvedValue();
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const asOwner = asUser((await sessionFor(owner)).accessToken);
        const url = API_ENDPOINTS.ACTIVITIES.CREATE(group.id);
        const idea = {
            category: ActivityCategory.OTHER,
            title: 'Idee',
            isRecurring: false,
            dateMode: DateMode.NONE,
        };

        for (let index = 0; index < 60; index += 1) {
            expect((await asOwner.post(url, idea)).status).toBe(201);
        }
        const over = await asOwner.post(url, idea);

        expect(over.status).toBe(429);
        expect(error(over).code).toBe(ERROR_CODES.RATE_LIMITED);
        expect(over.headers['retry-after']).toBeTruthy();
    });
});
