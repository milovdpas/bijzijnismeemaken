import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, NotificationChannel, NotificationType } from '@bzim/types';
import type { NotificationSettingDto } from '@bzim/types';

import NotificationSetting from '../src/app/domain/models/NotificationSetting.entity';
import { NotificationSettingService } from '../src/app/domain/services/NotificationSettingService';
import { sessionFor } from './support/auth';
import { asUser, data } from './support/client';
import { seedUser } from './support/factories';

const ALL_TYPES = Object.values(NotificationType);

describe('GET /me/notification-settings', () => {
    it('lists every type with defaults when nothing was changed', async () => {
        const user = await seedUser();
        const { accessToken } = await sessionFor(user);

        const response = await asUser(accessToken).get(API_ENDPOINTS.ME.NOTIFICATION_SETTINGS);

        expect(response.status).toBe(200);
        const settings = data<NotificationSettingDto[]>(response);
        expect(settings.map((s) => s.type)).toEqual(ALL_TYPES);
        expect(settings.every((s) => s.email && !s.push)).toBe(true);
        expect(await NotificationSetting.count()).toBe(0);
    });
});

describe('PUT /me/notification-settings/:type', () => {
    it('creates the row on first change and overwrites it after', async () => {
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);
        const url = API_ENDPOINTS.ME.NOTIFICATION_SETTING(NotificationType.ACTIVITY_CREATED);

        const first = await client.put(url, { email: false, push: true });
        expect(first.status).toBe(200);
        expect(data<NotificationSettingDto>(first)).toEqual({
            type: NotificationType.ACTIVITY_CREATED,
            email: false,
            push: true,
        });

        const second = await client.put(url, { email: true, push: true });
        expect(data<NotificationSettingDto>(second).email).toBe(true);
        expect(await NotificationSetting.countBy({ userId: user.id })).toBe(1);

        const listed = data<NotificationSettingDto[]>(
            await client.get(API_ENDPOINTS.ME.NOTIFICATION_SETTINGS),
        );
        expect(listed.find((s) => s.type === NotificationType.ACTIVITY_CREATED)).toEqual({
            type: NotificationType.ACTIVITY_CREATED,
            email: true,
            push: true,
        });
        expect(listed.find((s) => s.type === NotificationType.GROUP_INVITE)?.email).toBe(true);
    });

    it('rejects an unknown type and a half body', async () => {
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);

        expect(
            (
                await client.put(API_ENDPOINTS.ME.NOTIFICATION_SETTING('carrier_pigeon'), {
                    email: true,
                    push: false,
                })
            ).status,
        ).toBe(422);
        expect(
            (
                await client.put(
                    API_ENDPOINTS.ME.NOTIFICATION_SETTING(NotificationType.GROUP_INVITE),
                    {
                        email: true,
                    },
                )
            ).status,
        ).toBe(422);
    });

    it('is private to the account and goes with it', async () => {
        const user = await seedUser();
        const other = await seedUser();
        await NotificationSettingService.update(user, NotificationType.GROUP_INVITE, {
            email: false,
            push: false,
        });

        const theirs = await NotificationSettingService.list(other);
        expect(theirs.find((s) => s.type === NotificationType.GROUP_INVITE)?.email).toBe(true);

        await user.remove();
        expect(await NotificationSetting.count()).toBe(0);
    });
});

describe('NotificationSettingService.subscribers', () => {
    it('keeps the defaults for untouched people and honours a switched-off channel', async () => {
        const quiet = await seedUser();
        const loud = await seedUser();
        const untouched = await seedUser();
        await NotificationSettingService.update(quiet, NotificationType.GROUP_INVITE, {
            email: false,
            push: true,
        });
        await NotificationSettingService.update(loud, NotificationType.GROUP_INVITE, {
            email: true,
            push: true,
        });

        const byEmail = await NotificationSettingService.subscribers(
            [quiet, loud, untouched],
            NotificationType.GROUP_INVITE,
            NotificationChannel.EMAIL,
        );
        expect(byEmail.map((u) => u.id)).toEqual([loud.id, untouched.id]);

        const byPush = await NotificationSettingService.subscribers(
            [quiet, loud, untouched],
            NotificationType.GROUP_INVITE,
            NotificationChannel.PUSH,
        );
        expect(byPush.map((u) => u.id)).toEqual([quiet.id, loud.id]);

        expect(
            await NotificationSettingService.subscribers(
                [],
                NotificationType.GROUP_INVITE,
                NotificationChannel.EMAIL,
            ),
        ).toEqual([]);
    });
});
