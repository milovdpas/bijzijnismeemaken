import { describe, expect, it } from 'vitest';
import {
    API_ENDPOINTS,
    GroupAccess,
    GroupRole,
    LeaderboardPeriod,
    WIDGETS,
    WidgetType,
} from '@bzim/types';
import type { GroupDetailResponse, GroupWidgetDto } from '@bzim/types';

import GroupWidget from '../src/app/models/GroupWidget.entity';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import {
    seedActivity,
    seedGroup,
    seedLeaderboard,
    seedMember,
    seedUser,
} from './support/factories';

async function setup() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner);
    const member = await seedUser({ displayName: 'Anna' });
    await seedMember(group, member);
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asMember = asUser((await sessionFor(member)).accessToken);
    return { owner, group, member, asOwner, asMember };
}

describe('dashboard widgets', () => {
    it('seeds the defaults on group creation', async () => {
        const owner = await seedUser();
        const asOwner = asUser((await sessionFor(owner)).accessToken);
        const created = data<GroupDetailResponse>(
            await asOwner.post(API_ENDPOINTS.GROUPS.CREATE, {
                name: 'Kaartavond',
                description: null,
                access: GroupAccess.INVITE_ONLY,
            }),
        );
        const widgets = data<GroupWidgetDto[]>(
            await asOwner.get(API_ENDPOINTS.WIDGETS.LIST(created.id)),
        );
        expect(widgets.map((widget) => [widget.type, widget.position])).toEqual([
            [WidgetType.UPCOMING, 0],
            [WidgetType.IDEAS, 1],
        ]);
        expect(widgets[0]?.config).toEqual({ weeks: WIDGETS.UPCOMING_WEEKS_DEFAULT });
    });

    it('lets admins add, change, reorder and remove widgets; members only read', async () => {
        const { group, owner, asOwner, asMember } = await setup();
        const list = API_ENDPOINTS.WIDGETS.LIST(group.id);
        const board = await seedLeaderboard(group, owner);
        const activity = await seedActivity(group, owner);

        expect(
            (await asMember.post(list, { type: WidgetType.NOTE, config: { title: 'x', body: '' } }))
                .status,
        ).toBe(403);
        expect(data<GroupWidgetDto[]>(await asMember.get(list))).toEqual([]);

        const note = data<GroupWidgetDto>(
            await asOwner.post(list, {
                type: WidgetType.NOTE,
                config: { title: ' Volgende keer ', body: 'Bij Anna, neem wat mee.' },
            }),
        );
        expect(note).toMatchObject({
            type: WidgetType.NOTE,
            position: 0,
            config: { title: 'Volgende keer' },
        });
        const lb = data<GroupWidgetDto>(
            await asOwner.post(list, {
                type: WidgetType.LEADERBOARD,
                config: { leaderboardId: board.id, period: LeaderboardPeriod.TOTAL, limit: 3 },
            }),
        );
        const act = data<GroupWidgetDto>(
            await asOwner.post(list, {
                type: WidgetType.ACTIVITY,
                config: { activityId: activity.id },
            }),
        );
        const link = data<GroupWidgetDto>(
            await asOwner.post(list, {
                type: WidgetType.LINK,
                config: { label: 'Foto album', url: 'https://photos.example/x' },
            }),
        );
        expect([lb.position, act.position, link.position]).toEqual([1, 2, 3]);

        // Config must fit the type; targets must be the group's own.
        expect(
            (
                await asOwner.post(list, {
                    type: WidgetType.LINK,
                    config: { label: 'x', url: 'ftp://nope' },
                })
            ).status,
        ).toBe(422);
        expect(
            (await asOwner.post(list, { type: WidgetType.UPCOMING, config: { limit: 3 } })).status,
        ).toBe(422);
        const foreign = await seedLeaderboard(await seedGroup(await seedUser()), owner);
        const wrong = await asOwner.post(list, {
            type: WidgetType.LEADERBOARD,
            config: { leaderboardId: foreign.id, period: LeaderboardPeriod.TOTAL, limit: 3 },
        });
        expect(wrong.status).toBe(422);
        expect(error(wrong).details).toEqual({ problem: 'TARGET_NOT_FOUND' });

        // Update checks the stored type, not whatever the body claims.
        const detail = API_ENDPOINTS.WIDGETS.DETAIL(group.id, note.id);
        expect((await asOwner.patch(detail, { config: { weeks: 2 } })).status).toBe(422);
        expect(
            data<GroupWidgetDto>(
                await asOwner.patch(detail, { config: { title: 'Nieuw', body: '' } }),
            ).config,
        ).toEqual({ title: 'Nieuw', body: '' });
        expect((await asMember.patch(detail, { config: { title: 'Hack', body: '' } })).status).toBe(
            403,
        );

        // Reorder: a full permutation or nothing.
        const order = API_ENDPOINTS.WIDGETS.ORDER(group.id);
        const partial = await asOwner.put(order, { widgetIds: [note.id, lb.id] });
        expect(partial.status).toBe(422);
        expect(error(partial).details).toEqual({ problem: 'NOT_A_PERMUTATION' });
        const reordered = data<GroupWidgetDto[]>(
            await asOwner.put(order, { widgetIds: [link.id, act.id, lb.id, note.id] }),
        );
        expect(reordered.map((widget) => widget.id)).toEqual([link.id, act.id, lb.id, note.id]);
        expect(reordered.map((widget) => widget.position)).toEqual([0, 1, 2, 3]);

        // Removal, and the widgets of a deleted leaderboard or activity go with it.
        expect((await asOwner.delete(detail)).status).toBe(204);
        expect((await asOwner.delete(detail)).status).toBe(404);
        expect(
            (await asOwner.delete(API_ENDPOINTS.LEADERBOARDS.DETAIL(group.id, board.id))).status,
        ).toBe(204);
        expect(
            (await asOwner.delete(API_ENDPOINTS.ACTIVITIES.DETAIL(group.id, activity.id))).status,
        ).toBe(204);
        expect((await GroupWidget.find({ where: { groupId: group.id } })).map((w) => w.id)).toEqual(
            [link.id],
        );

        // Restore defaults appends what is missing, once.
        const restored = data<GroupWidgetDto[]>(
            await asOwner.post(API_ENDPOINTS.WIDGETS.RESTORE_DEFAULTS(group.id)),
        );
        expect(restored.map((widget) => widget.type)).toEqual([
            WidgetType.LINK,
            WidgetType.UPCOMING,
            WidgetType.IDEAS,
        ]);
        expect(
            data<GroupWidgetDto[]>(
                await asOwner.post(API_ENDPOINTS.WIDGETS.RESTORE_DEFAULTS(group.id)),
            ),
        ).toHaveLength(3);
    });

    it('caps the dashboard', async () => {
        const { group, asOwner } = await setup();
        const list = API_ENDPOINTS.WIDGETS.LIST(group.id);
        for (let index = 0; index < WIDGETS.MAX_PER_GROUP; index += 1) {
            expect(
                (await asOwner.post(list, { type: WidgetType.IDEAS, config: { limit: 5 } })).status,
            ).toBe(201);
        }
        const full = await asOwner.post(list, { type: WidgetType.IDEAS, config: { limit: 5 } });
        expect(full.status).toBe(409);
        expect(error(full).details).toEqual({ problem: 'TOO_MANY' });
        expect(GroupRole.ADMIN).toBe('admin');
    });
});
