import cookieParser from 'cookie-parser';
import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { GroupAccess, GroupRole } from '@bzim/types';

import { requireGroupRole } from '../src/app/http/middleware/RequireGroupRole';
import { userAuth } from '../src/app/http/middleware/UserAuth';
import Group from '../src/app/domain/models/Group.entity';
import GroupInvite from '../src/app/domain/models/GroupInvite.entity';
import GroupMember from '../src/app/domain/models/GroupMember.entity';
import { MembershipService } from '../src/app/domain/services/MembershipService';
import { sessionFor } from './support/auth';
import { seedGroup, seedMember, seedUser } from './support/factories';

/** A group with an owner, an admin and a member, all seeded. */
async function trio() {
    const [ownerUser, adminUser, memberUser] = await Promise.all([
        seedUser(),
        seedUser(),
        seedUser(),
    ]);
    const group = await seedGroup(ownerUser);
    const owner = await GroupMember.findOneByOrFail({ groupId: group.id, userId: ownerUser.id });
    const admin = await seedMember(group, adminUser, GroupRole.ADMIN);
    const member = await seedMember(group, memberUser, GroupRole.MEMBER);
    return { group, ownerUser, adminUser, memberUser, owner, admin, member };
}

const roleOf = async (group: Group, userId: string) =>
    (await GroupMember.findOneByOrFail({ groupId: group.id, userId })).role;

describe('MembershipService', () => {
    it('lists members by display name, regardless of role or case', async () => {
        const { group, ownerUser, adminUser, memberUser } = await trio();
        ownerUser.displayName = 'zoe';
        adminUser.displayName = 'Milo';
        memberUser.displayName = 'anna';
        await Promise.all([ownerUser.save(), adminUser.save(), memberUser.save()]);

        const list = await MembershipService.list(group);

        expect(list.map((m) => m.user.displayName)).toEqual(['anna', 'Milo', 'zoe']);
        expect(list.map((m) => m.role)).toEqual([
            GroupRole.MEMBER,
            GroupRole.ADMIN,
            GroupRole.OWNER,
        ]);
        expect(JSON.stringify(list)).not.toContain('@example.com');
    });

    it('lets only the owner promote and demote', async () => {
        const { group, owner, admin, memberUser, adminUser } = await trio();

        expect(
            await MembershipService.changeRole(group, admin, memberUser.id, GroupRole.ADMIN),
        ).toEqual({
            ok: false,
            problem: 'FORBIDDEN',
        });
        expect(
            (await MembershipService.changeRole(group, owner, memberUser.id, GroupRole.ADMIN)).ok,
        ).toBe(true);
        expect(await roleOf(group, memberUser.id)).toBe(GroupRole.ADMIN);
        expect(
            (await MembershipService.changeRole(group, owner, adminUser.id, GroupRole.MEMBER)).ok,
        ).toBe(true);
        expect(await roleOf(group, adminUser.id)).toBe(GroupRole.MEMBER);
        expect(
            await MembershipService.changeRole(group, owner, owner.userId, GroupRole.MEMBER),
        ).toEqual({
            ok: false,
            problem: 'CANNOT_TARGET_SELF',
        });
    });

    it('lets admins remove members but not admins or the owner', async () => {
        const { group, owner, admin, member, ownerUser, memberUser } = await trio();
        const secondAdmin = await seedMember(group, await seedUser(), GroupRole.ADMIN);

        expect(await MembershipService.remove(group, member, memberUser.id)).toEqual({
            ok: false,
            problem: 'CANNOT_TARGET_SELF',
        });
        expect(await MembershipService.remove(group, admin, secondAdmin.userId)).toEqual({
            ok: false,
            problem: 'FORBIDDEN',
        });
        expect(await MembershipService.remove(group, admin, ownerUser.id)).toEqual({
            ok: false,
            problem: 'FORBIDDEN',
        });
        expect((await MembershipService.remove(group, admin, memberUser.id)).ok).toBe(true);
        expect((await MembershipService.remove(group, owner, secondAdmin.userId)).ok).toBe(true);
        expect(await GroupMember.countBy({ groupId: group.id })).toBe(2);
    });

    it('transfers ownership and keeps the old owner as admin', async () => {
        const { group, owner, admin, memberUser, ownerUser } = await trio();

        expect(await MembershipService.transferOwnership(group, admin, memberUser.id)).toEqual({
            ok: false,
            problem: 'FORBIDDEN',
        });
        expect((await MembershipService.transferOwnership(group, owner, memberUser.id)).ok).toBe(
            true,
        );

        expect(await roleOf(group, memberUser.id)).toBe(GroupRole.OWNER);
        expect(await roleOf(group, ownerUser.id)).toBe(GroupRole.ADMIN);
        expect((await Group.findOneByOrFail({ id: group.id })).ownerId).toBe(memberUser.id);
        expect(await GroupMember.countBy({ groupId: group.id, role: GroupRole.OWNER })).toBe(1);
    });

    it('lets members and admins leave, never the owner', async () => {
        const { group, owner, admin, member, memberUser } = await trio();
        await GroupInvite.create({
            groupId: group.id,
            invitedUserId: memberUser.id,
            invitedById: null,
        }).save();

        expect(await MembershipService.leave(group, owner)).toEqual({
            ok: false,
            problem: 'OWNER_MUST_TRANSFER',
        });
        expect((await MembershipService.leave(group, member)).ok).toBe(true);
        expect((await MembershipService.leave(group, admin)).ok).toBe(true);

        expect(await GroupMember.countBy({ groupId: group.id })).toBe(1);
        expect(await GroupInvite.countBy({ groupId: group.id })).toBe(0);
    });

    it('counts the groups a person owns', async () => {
        const { ownerUser, memberUser } = await trio();
        await seedGroup(ownerUser);

        expect(await Group.countOwnedBy(ownerUser)).toBe(2);
        expect(await Group.countOwnedBy(memberUser)).toBe(0);
    });
});

/** `requireGroupRole` has no route yet (task 12), so it is probed on a one-route app. */
const probe = supertest(
    express()
        .use(cookieParser())
        .get(
            '/groups/:groupId/admin-only',
            userAuth,
            requireGroupRole(GroupRole.ADMIN),
            (req, res) => {
                res.json({ group: req.group.id, role: req.membership.role });
            },
        )
        .get('/groups/:groupId/members-only', userAuth, requireGroupRole(), (req, res) => {
            res.json({ role: req.membership.role });
        }),
);

describe('requireGroupRole', () => {
    it('loads the group and membership for a member with enough role', async () => {
        const { group, adminUser } = await trio();
        const { accessToken } = await sessionFor(adminUser);

        const response = await probe
            .get(`/groups/${group.id}/admin-only`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ group: group.id, role: GroupRole.ADMIN });
    });

    it('answers 403 for a member below the required role', async () => {
        const { group, memberUser } = await trio();
        const { accessToken } = await sessionFor(memberUser);

        const denied = await probe
            .get(`/groups/${group.id}/admin-only`)
            .set('Authorization', `Bearer ${accessToken}`);
        const allowed = await probe
            .get(`/groups/${group.id}/members-only`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(denied.status).toBe(403);
        expect(allowed.status).toBe(200);
    });

    it('hides a private group from non-members with a 404', async () => {
        const { group } = await trio();
        const stranger = await seedUser();
        const { accessToken } = await sessionFor(stranger);

        const response = await probe
            .get(`/groups/${group.id}/members-only`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
    });

    it('tells a non-member of a public group to join, with a 403', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner, { access: GroupAccess.PUBLIC });
        const stranger = await seedUser();
        const { accessToken } = await sessionFor(stranger);

        const response = await probe
            .get(`/groups/${group.id}/members-only`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
    });

    it('answers 404 for an unknown or malformed id', async () => {
        const user = await seedUser();
        const { accessToken } = await sessionFor(user);

        const unknown = await probe
            .get('/groups/00000000-0000-4000-8000-000000000000/members-only')
            .set('Authorization', `Bearer ${accessToken}`);
        const malformed = await probe
            .get('/groups/not-a-uuid/members-only')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(unknown.status).toBe(404);
        expect(malformed.status).toBe(404);
    });
});
