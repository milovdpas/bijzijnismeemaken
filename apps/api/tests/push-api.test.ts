import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, Locale, NotificationType } from '@bzim/types';
import type { PushSubscriptionDto, PushSubscriptionsResponse } from '@bzim/types';

import PushSubscription from '../src/app/models/PushSubscription.entity';
import { mailer } from '../src/app/modules/mail';
import { PushGone, pushSender } from '../src/app/modules/push';
import type { PushMessage, PushTarget } from '../src/app/modules/push';
import { NotificationSettingService } from '../src/app/services/NotificationSettingService';
import { sessionFor } from './support/auth';
import { asUser, data } from './support/client';
import { seedGroup, seedUser } from './support/factories';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';
const KEYS = { p256dh: 'BPublicKeyOfTheBrowser', auth: 'AuthSecret' };

/** Every push that would have gone out, oldest first. */
function pushed(): { target: PushTarget; message: PushMessage }[] {
    const sent: { target: PushTarget; message: PushMessage }[] = [];
    vi.spyOn(pushSender, 'send').mockImplementation((target, message) => {
        sent.push({ target: { ...target }, message });
        return Promise.resolve();
    });
    return sent;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('/me/push-subscriptions', () => {
    it('registers a browser once, lists it, and lets its owner remove it', async () => {
        const user = await seedUser();
        const asMe = asUser((await sessionFor(user)).accessToken);

        const created = await asMe.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
            endpoint: ENDPOINT,
            keys: KEYS,
        });
        expect(created.status).toBe(201);
        const dto = data<PushSubscriptionDto>(created);
        expect(dto).toMatchObject({ endpoint: ENDPOINT, lastUsedAt: null });

        // The same browser again, with fresh keys: still one row.
        await asMe.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
            endpoint: ENDPOINT,
            keys: { ...KEYS, auth: 'NewSecret' },
        });
        expect(await PushSubscription.count()).toBe(1);
        expect((await PushSubscription.findOneByOrFail({ endpoint: ENDPOINT })).auth).toBe(
            'NewSecret',
        );

        // No VAPID keys in the test environment, so the server says it cannot push.
        const listed = data<PushSubscriptionsResponse>(
            await asMe.get(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS),
        );
        expect(listed.publicKey).toBeNull();
        expect(listed.subscriptions.map((row) => row.id)).toEqual([dto.id]);

        expect((await asMe.delete(API_ENDPOINTS.ME.PUSH_SUBSCRIPTION(dto.id))).status).toBe(204);
        expect(await PushSubscription.count()).toBe(0);
        expect((await asMe.delete(API_ENDPOINTS.ME.PUSH_SUBSCRIPTION(dto.id))).status).toBe(404);
    });

    it('moves a shared browser to whoever subscribed last, and hides it from the other', async () => {
        const anna = await seedUser();
        const bob = await seedUser();
        const asAnna = asUser((await sessionFor(anna)).accessToken);
        const asBob = asUser((await sessionFor(bob)).accessToken);

        const hers = data<PushSubscriptionDto>(
            await asAnna.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
                endpoint: ENDPOINT,
                keys: KEYS,
            }),
        );
        await asBob.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, { endpoint: ENDPOINT, keys: KEYS });

        expect(await PushSubscription.count()).toBe(1);
        expect((await PushSubscription.findOneByOrFail({ endpoint: ENDPOINT })).userId).toBe(
            bob.id,
        );
        expect(
            data<PushSubscriptionsResponse>(await asAnna.get(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS))
                .subscriptions,
        ).toEqual([]);
        expect((await asAnna.delete(API_ENDPOINTS.ME.PUSH_SUBSCRIPTION(hers.id))).status).toBe(404);

        expect(
            (
                await asBob.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
                    endpoint: 'not a url',
                    keys: KEYS,
                })
            ).status,
        ).toBe(422);
        // Only the browsers' push services: the API posts to whatever it stores.
        for (const endpoint of [
            'https://10.0.0.5:8443/admin',
            'https://evil.example/fcm.googleapis.com',
            'http://fcm.googleapis.com/fcm/send/abc',
        ]) {
            expect(
                (await asBob.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, { endpoint, keys: KEYS }))
                    .status,
            ).toBe(422);
        }
        expect(
            (
                await asBob.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
                    endpoint: 'https://web.push.apple.com/QAbc',
                    keys: KEYS,
                })
            ).status,
        ).toBe(201);
    });

    it('goes with the account', async () => {
        const user = await seedUser();
        const asMe = asUser((await sessionFor(user)).accessToken);
        await asMe.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, { endpoint: ENDPOINT, keys: KEYS });

        await user.remove();
        expect(await PushSubscription.count()).toBe(0);
    });
});

describe('push as a notification channel', () => {
    it('pushes to the devices of people who turned the type on, in their language', async () => {
        vi.spyOn(mailer, 'send').mockResolvedValue();
        const sent = pushed();
        const owner = await seedUser({ displayName: 'Milo' });
        const group = await seedGroup(owner, { name: 'Kaartavond' });
        const anna = await seedUser({ handle: 'anna', locale: Locale.EN });
        const asOwner = asUser((await sessionFor(owner)).accessToken);
        const asAnna = asUser((await sessionFor(anna)).accessToken);
        await asAnna.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
            endpoint: ENDPOINT,
            keys: KEYS,
        });
        await asAnna.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
            endpoint: `${ENDPOINT}-phone`,
            keys: KEYS,
        });

        // Push is off by default: nothing goes out.
        await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' });
        expect(sent).toEqual([]);

        await NotificationSettingService.update(anna, NotificationType.GROUP_INVITE, {
            email: true,
            push: true,
        });
        const invites = data<{ id: string }[]>(
            await asOwner.get(API_ENDPOINTS.GROUPS.INVITES(group.id)),
        );
        await asOwner.delete(API_ENDPOINTS.GROUPS.INVITE(group.id, invites[0]?.id ?? ''));
        await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' });

        expect(sent.map((item) => item.target.endpoint).sort()).toEqual([
            ENDPOINT,
            `${ENDPOINT}-phone`,
        ]);
        expect(sent[0]?.message).toEqual({
            title: 'Invitation to Kaartavond',
            body: 'Milo invited you.',
            url: '/invites',
            tag: 'invite',
        });
        const rows = await PushSubscription.findBy({ userId: anna.id });
        expect(rows.every((row) => row.lastUsedAt !== null)).toBe(true);
    });

    it('forgets a subscription the push service reports gone and survives other failures', async () => {
        vi.spyOn(mailer, 'send').mockResolvedValue();
        vi.spyOn(pushSender, 'send').mockImplementation((target) => {
            if (target.endpoint === ENDPOINT) return Promise.reject(new PushGone(target.endpoint));
            return Promise.reject(new Error('push service down'));
        });
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const anna = await seedUser({ handle: 'anna' });
        await NotificationSettingService.update(anna, NotificationType.GROUP_INVITE, {
            email: false,
            push: true,
        });
        const asOwner = asUser((await sessionFor(owner)).accessToken);
        const asAnna = asUser((await sessionFor(anna)).accessToken);
        await asAnna.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
            endpoint: ENDPOINT,
            keys: KEYS,
        });
        await asAnna.post(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
            endpoint: `${ENDPOINT}-phone`,
            keys: KEYS,
        });

        const response = await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), {
            handle: 'anna',
        });

        expect(response.status).toBe(201);
        expect((await PushSubscription.find()).map((row) => row.endpoint)).toEqual([
            `${ENDPOINT}-phone`,
        ]);
    });
});
