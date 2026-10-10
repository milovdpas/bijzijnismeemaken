import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES, GroupRole } from '@bzim/types';
import type { GroupMemberResponse } from '@bzim/types';

import Group from '../src/app/models/Group.entity';
import GroupMember from '../src/app/models/GroupMember.entity';
import User from '../src/app/models/User.entity';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import { seedGroup, seedMember, seedUser } from './support/factories';

/** A group with an owner, an admin and a member, each with a client. */
async function trio() {
    const [owner, admin, member] = await Promise.all([seedUser(), seedUser(), seedUser()]);
    const group = await seedGroup(owner);
    await seedMember(group, admin, GroupRole.ADMIN);
    await seedMember(group, member);
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asAdmin = asUser((await sessionFor(admin)).accessToken);
    const asMember = asUser((await sessionFor(member)).accessToken);
    return { group, owner, admin, member, asOwner, asAdmin, asMember };
}

const roleOf = async (group: Group, userId: string) =>
    (await GroupMember.findOneByOrFail({ groupId: group.id, userId })).role;

describe('GET /groups/:groupId/members', () => {
    it('lists members with their public profile and role', async () => {
        const { group, owner, asMember } = await trio();

        const members = data<GroupMemberResponse[]>(
            await asMember.get(API_ENDPOINTS.GROUPS.MEMBERS(group.id)),
        );

        expect(members).toHaveLength(3);
        const ownerRow = members.find((m) => m.user.id === owner.id);
        expect(ownerRow?.role).toBe(GroupRole.OWNER);
        expect(ownerRow?.user.handle).toBe(owner.handle);
        expect(JSON.stringify(members)).not.toContain('@example.com');
    });

    it('is hidden from non-members', async () => {
        const { group } = await trio();
        const stranger = await seedUser();
        const client = asUser((await sessionFor(stranger)).accessToken);

        expect((await client.get(API_ENDPOINTS.GROUPS.MEMBERS(group.id))).status).toBe(404);
    });
});

describe('PATCH /groups/:groupId/members/:userId', () => {
    it('lets the owner promote and demote, nobody else', async () => {
        const { group, admin, member, asOwner, asAdmin } = await trio();

        const denied = await asAdmin.patch(API_ENDPOINTS.GROUPS.MEMBER(group.id, member.id), {
            role: GroupRole.ADMIN,
        });
        expect(denied.status).toBe(403);

        const promoted = await asOwner.patch(API_ENDPOINTS.GROUPS.MEMBER(group.id, member.id), {
            role: GroupRole.ADMIN,
        });
        expect(promoted.status).toBe(204);
        expect(await roleOf(group, member.id)).toBe(GroupRole.ADMIN);

        const demoted = await asOwner.patch(API_ENDPOINTS.GROUPS.MEMBER(group.id, admin.id), {
            role: GroupRole.MEMBER,
        });
        expect(demoted.status).toBe(204);
        expect(await roleOf(group, admin.id)).toBe(GroupRole.MEMBER);
    });

    it('refuses the owner role, self, and unknown members', async () => {
        const { group, owner, member, asOwner } = await trio();
        const outsider = await seedUser();

        expect(
            (
                await asOwner.patch(API_ENDPOINTS.GROUPS.MEMBER(group.id, member.id), {
                    role: 'owner',
                })
            ).status,
        ).toBe(422);
        const self = await asOwner.patch(API_ENDPOINTS.GROUPS.MEMBER(group.id, owner.id), {
            role: GroupRole.MEMBER,
        });
        expect(self.status).toBe(409);
        expect(
            (
                await asOwner.patch(API_ENDPOINTS.GROUPS.MEMBER(group.id, outsider.id), {
                    role: GroupRole.ADMIN,
                })
            ).status,
        ).toBe(404);
    });
});

describe('DELETE /groups/:groupId/members/:userId', () => {
    it('lets admins remove members but not admins or the owner', async () => {
        const { group, owner, admin, member, asAdmin, asOwner, asMember } = await trio();
        const otherAdmin = await seedUser();
        await seedMember(group, otherAdmin, GroupRole.ADMIN);

        expect(
            (await asMember.delete(API_ENDPOINTS.GROUPS.MEMBER(group.id, admin.id))).status,
        ).toBe(403);
        expect(
            (await asAdmin.delete(API_ENDPOINTS.GROUPS.MEMBER(group.id, otherAdmin.id))).status,
        ).toBe(403);
        expect((await asAdmin.delete(API_ENDPOINTS.GROUPS.MEMBER(group.id, owner.id))).status).toBe(
            403,
        );
        expect((await asAdmin.delete(API_ENDPOINTS.GROUPS.MEMBER(group.id, admin.id))).status).toBe(
            409,
        );

        expect(
            (await asAdmin.delete(API_ENDPOINTS.GROUPS.MEMBER(group.id, member.id))).status,
        ).toBe(204);
        expect(
            (await asOwner.delete(API_ENDPOINTS.GROUPS.MEMBER(group.id, otherAdmin.id))).status,
        ).toBe(204);
        expect(await GroupMember.countBy({ groupId: group.id })).toBe(2);
    });
});

describe('POST /groups/:groupId/transfer-ownership', () => {
    it('moves ownership and keeps the old owner as admin', async () => {
        const { group, owner, member, asOwner, asAdmin } = await trio();

        expect(
            (
                await asAdmin.post(API_ENDPOINTS.GROUPS.TRANSFER_OWNERSHIP(group.id), {
                    userId: member.id,
                })
            ).status,
        ).toBe(403);

        const response = await asOwner.post(API_ENDPOINTS.GROUPS.TRANSFER_OWNERSHIP(group.id), {
            userId: member.id,
        });

        expect(response.status).toBe(204);
        expect(await roleOf(group, member.id)).toBe(GroupRole.OWNER);
        expect(await roleOf(group, owner.id)).toBe(GroupRole.ADMIN);
        expect((await Group.findOneByOrFail({ id: group.id })).ownerId).toBe(member.id);

        // The old owner is an admin now and may not transfer again.
        expect(
            (
                await asOwner.post(API_ENDPOINTS.GROUPS.TRANSFER_OWNERSHIP(group.id), {
                    userId: owner.id,
                })
            ).status,
        ).toBe(403);
    });
});

describe('POST /groups/:groupId/leave', () => {
    it('lets members and admins leave and refuses the owner', async () => {
        const { group, asOwner, asAdmin, asMember } = await trio();

        const refused = await asOwner.post(API_ENDPOINTS.GROUPS.LEAVE(group.id));
        expect(refused.status).toBe(409);
        expect(error(refused).code).toBe(ERROR_CODES.OWNER_MUST_TRANSFER);

        expect((await asMember.post(API_ENDPOINTS.GROUPS.LEAVE(group.id))).status).toBe(204);
        expect((await asAdmin.post(API_ENDPOINTS.GROUPS.LEAVE(group.id))).status).toBe(204);
        expect(await GroupMember.countBy({ groupId: group.id })).toBe(1);

        // Gone means gone: the group is now a 404 for them.
        expect((await asMember.get(API_ENDPOINTS.GROUPS.DETAIL(group.id))).status).toBe(404);
    });
});

describe('DELETE /me while owning a group', () => {
    it('is refused until ownership is transferred', async () => {
        const { group, owner, member, asOwner } = await trio();

        const refused = await asOwner.delete(API_ENDPOINTS.ME.ROOT);
        expect(refused.status).toBe(409);
        expect(error(refused).code).toBe(ERROR_CODES.OWNER_MUST_TRANSFER);
        expect(await User.countBy({ id: owner.id })).toBe(1);

        await asOwner.post(API_ENDPOINTS.GROUPS.TRANSFER_OWNERSHIP(group.id), {
            userId: member.id,
        });
        expect((await asOwner.delete(API_ENDPOINTS.ME.ROOT)).status).toBe(204);
        expect(await User.countBy({ id: owner.id })).toBe(0);
        expect(await GroupMember.countBy({ groupId: group.id })).toBe(2);
    });
});
