import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES, GROUP, GroupAccess, GroupRole } from '@bzim/types';
import type {
    GroupDetailResponse,
    GroupListingResponse,
    InviteLinkResponse,
    JoinPreviewResponse,
    Paginated,
    PublicGroupResponse,
} from '@bzim/types';

import { env } from '../src/config/app';
import Group from '../src/app/models/Group.entity';
import GroupMember from '../src/app/models/GroupMember.entity';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import { seedGroup, seedMember, seedUser } from './support/factories';

async function client(overrides = {}) {
    const user = await seedUser(overrides);
    const { accessToken } = await sessionFor(user);
    return { user, api: asUser(accessToken) };
}

/** The token is the last 43 characters of the link; the slug before it is cosmetic. */
const tokenOf = (link: string) => link.slice(-GROUP.INVITE_TOKEN_LENGTH);

describe('POST /groups', () => {
    it('creates a group with the caller as owner and returns the invite link', async () => {
        const { user, api } = await client();

        const response = await api.post(API_ENDPOINTS.GROUPS.CREATE, {
            name: '  Vrijdagavond  ',
            description: '',
            access: GroupAccess.INVITE_LINK,
        });

        expect(response.status).toBe(201);
        const group = data<GroupDetailResponse>(response);
        expect(group.name).toBe('Vrijdagavond');
        expect(group.slug).toBe('vrijdagavond');
        expect(group.description).toBeNull();
        expect(group.role).toBe(GroupRole.OWNER);
        expect(group.memberCount).toBe(1);
        expect(group.inviteLink).toBe(
            `${env.appUrl}/join/vrijdagavond-${tokenOf(group.inviteLink ?? '')}`,
        );
        expect((await Group.findOneByOrFail({ id: group.id })).ownerId).toBe(user.id);
    });

    it('refuses an unfinished profile and a bad payload', async () => {
        const { api: unfinished } = await client({
            handle: null,
            displayName: null,
            avatarKey: null,
        });
        const { api } = await client();

        const blocked = await unfinished.post(API_ENDPOINTS.GROUPS.CREATE, {
            name: 'Nope',
            access: GroupAccess.PUBLIC,
        });
        expect(blocked.status).toBe(403);
        expect(error(blocked).code).toBe(ERROR_CODES.ONBOARDING_REQUIRED);

        expect(
            (await api.post(API_ENDPOINTS.GROUPS.CREATE, { name: 'x', access: 'public' })).status,
        ).toBe(422);
        expect(
            (await api.post(API_ENDPOINTS.GROUPS.CREATE, { name: 'Ok', access: 'secret' })).status,
        ).toBe(422);
    });
});

describe('GET /groups', () => {
    it('lists my groups with my role and the size', async () => {
        const { user, api } = await client();
        const mine = await seedGroup(user, { name: 'Mine' });
        const other = await seedUser();
        const theirs = await seedGroup(other, { name: 'Theirs' });
        await seedMember(theirs, user, GroupRole.ADMIN);
        await seedGroup(other, { name: 'Not mine' });

        const groups = data<GroupListingResponse[]>(await api.get(API_ENDPOINTS.GROUPS.LIST));

        expect(groups.map((g) => g.name).sort()).toEqual(['Mine', 'Theirs']);
        expect(groups.find((g) => g.id === mine.id)?.role).toBe(GroupRole.OWNER);
        expect(groups.find((g) => g.id === theirs.id)?.memberCount).toBe(2);
    });
});

describe('GET /groups/public', () => {
    it('pages through public groups by name', async () => {
        const { api } = await client();
        const owner = await seedUser();
        await seedGroup(owner, { name: 'Kaartavond', access: GroupAccess.PUBLIC });
        await seedGroup(owner, { name: 'Bordspelkaarten', access: GroupAccess.PUBLIC });
        await seedGroup(owner, { name: 'Kaart geheim', access: GroupAccess.INVITE_ONLY });

        const page = data<Paginated<PublicGroupResponse>>(
            await api.get(`${API_ENDPOINTS.GROUPS.PUBLIC}?q=kaart&pageSize=1`),
        );

        expect(page.total).toBe(2);
        expect(page.items.map((g) => g.name)).toEqual(['Bordspelkaarten']);
        expect(page.hasMore).toBe(true);
        expect(page.items[0]?.memberCount).toBe(1);

        expect((await api.get(`${API_ENDPOINTS.GROUPS.PUBLIC}?pageSize=500`)).status).toBe(422);
    });
});

describe('GET /groups/:groupId', () => {
    it('shows the invite link to admins only', async () => {
        const { user: owner, api: asOwner } = await client();
        const group = await seedGroup(owner, { access: GroupAccess.INVITE_LINK });
        const { user: member, api: asMember } = await client();
        await seedMember(group, member);

        const forOwner = data<GroupDetailResponse>(
            await asOwner.get(API_ENDPOINTS.GROUPS.DETAIL(group.id)),
        );
        const forMember = data<GroupDetailResponse>(
            await asMember.get(API_ENDPOINTS.GROUPS.DETAIL(group.id)),
        );

        expect(forOwner.inviteLink).toContain('/join/');
        expect(forMember.inviteLink).toBeNull();
        expect(forMember.role).toBe(GroupRole.MEMBER);
        expect(forMember.memberCount).toBe(2);
    });

    it('is 404 for strangers and for a bad id', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const { api } = await client();

        expect((await api.get(API_ENDPOINTS.GROUPS.DETAIL(group.id))).status).toBe(404);
        expect((await api.get(API_ENDPOINTS.GROUPS.DETAIL('nope'))).status).toBe(422);
    });
});

describe('PATCH and DELETE /groups/:groupId', () => {
    it('lets admins change settings and only the owner delete', async () => {
        const { user: owner, api: asOwner } = await client();
        const group = await seedGroup(owner, { access: GroupAccess.INVITE_ONLY });
        const { user: admin, api: asAdmin } = await client();
        await seedMember(group, admin, GroupRole.ADMIN);
        const { user: member, api: asMember } = await client();
        await seedMember(group, member);

        const denied = await asMember.patch(API_ENDPOINTS.GROUPS.DETAIL(group.id), {
            name: 'Hacked',
        });
        expect(denied.status).toBe(403);

        const updated = data<GroupDetailResponse>(
            await asAdmin.patch(API_ENDPOINTS.GROUPS.DETAIL(group.id), {
                name: 'Nieuwe naam',
                access: GroupAccess.INVITE_LINK,
            }),
        );
        expect(updated.slug).toBe('nieuwe-naam');
        expect(updated.inviteLink).toContain('/join/nieuwe-naam-');

        expect((await asAdmin.patch(API_ENDPOINTS.GROUPS.DETAIL(group.id), {})).status).toBe(422);
        expect((await asAdmin.delete(API_ENDPOINTS.GROUPS.DETAIL(group.id))).status).toBe(403);
        expect((await asOwner.delete(API_ENDPOINTS.GROUPS.DETAIL(group.id))).status).toBe(204);
        expect(await Group.countBy({ id: group.id })).toBe(0);
        expect(await GroupMember.countBy({ groupId: group.id })).toBe(0);
    });
});

describe('POST /groups/:groupId/join', () => {
    it('joins a public group once, never a private one', async () => {
        const owner = await seedUser();
        const open = await seedGroup(owner, { access: GroupAccess.PUBLIC });
        const closed = await seedGroup(owner, { access: GroupAccess.INVITE_ONLY });
        const { api } = await client();

        const joined = await api.post(API_ENDPOINTS.GROUPS.JOIN(open.id));
        expect(joined.status).toBe(201);
        expect(data<GroupDetailResponse>(joined).role).toBe(GroupRole.MEMBER);

        const again = await api.post(API_ENDPOINTS.GROUPS.JOIN(open.id));
        expect(again.status).toBe(409);
        expect(error(again).code).toBe(ERROR_CODES.CONFLICT);

        expect((await api.post(API_ENDPOINTS.GROUPS.JOIN(closed.id))).status).toBe(404);
    });
});

describe('invite links', () => {
    it('previews and joins by token, and a regenerated link kills the old one', async () => {
        const { user: owner, api: asOwner } = await client();
        const group = await seedGroup(owner, {
            access: GroupAccess.INVITE_LINK,
            name: 'Spelletjes',
        });
        const token = group.inviteToken ?? '';
        const { api } = await client();

        const preview = data<JoinPreviewResponse>(
            await api.get(API_ENDPOINTS.JOIN.BY_TOKEN(token)),
        );
        expect(preview).toEqual({
            id: group.id,
            name: 'Spelletjes',
            description: null,
            memberCount: 1,
            alreadyMember: false,
        });

        const joined = await api.post(API_ENDPOINTS.JOIN.BY_TOKEN(token));
        expect(joined.status).toBe(201);
        expect(
            data<JoinPreviewResponse>(await api.get(API_ENDPOINTS.JOIN.BY_TOKEN(token)))
                .alreadyMember,
        ).toBe(true);
        expect((await api.post(API_ENDPOINTS.JOIN.BY_TOKEN(token))).status).toBe(409);

        const fresh = data<InviteLinkResponse>(
            await asOwner.post(API_ENDPOINTS.GROUPS.REGENERATE_INVITE_LINK(group.id)),
        );
        expect(fresh.inviteLink).toContain('/join/spelletjes-');
        expect(tokenOf(fresh.inviteLink)).not.toBe(token);

        const { api: late } = await client();
        expect((await late.get(API_ENDPOINTS.JOIN.BY_TOKEN(token))).status).toBe(404);
        expect(
            (await late.get(API_ENDPOINTS.JOIN.BY_TOKEN(tokenOf(fresh.inviteLink)))).status,
        ).toBe(200);
    });

    it('is 404 for a token of a group that no longer uses links, 422 for a malformed one', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner, { access: GroupAccess.INVITE_LINK });
        const token = group.inviteToken ?? '';
        group.access = GroupAccess.INVITE_ONLY;
        group.inviteToken = null;
        await group.save();
        const { api } = await client();

        expect((await api.get(API_ENDPOINTS.JOIN.BY_TOKEN(token))).status).toBe(404);
        expect((await api.get(API_ENDPOINTS.JOIN.BY_TOKEN('short'))).status).toBe(422);
    });
});
