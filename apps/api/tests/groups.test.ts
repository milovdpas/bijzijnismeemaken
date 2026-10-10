import { describe, expect, it } from 'vitest';
import { GroupAccess, GroupRole, slugify } from '@bzim/types';

import Group from '../src/app/models/Group.entity';
import GroupInvite from '../src/app/models/GroupInvite.entity';
import GroupMember from '../src/app/models/GroupMember.entity';
import { GroupService } from '../src/app/services/GroupService';

import { seedGroup, seedMember, seedUser } from './support/factories';

describe('schema', () => {
    it('allows one membership per person per group', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const friend = await seedUser();
        await seedMember(group, friend);

        await expect(seedMember(group, friend)).rejects.toThrow(/Duplicate entry/);
    });

    it('drops memberships and invites with the group', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const friend = await seedUser();
        await seedMember(group, friend);
        await GroupInvite.create({
            groupId: group.id,
            invitedUserId: (await seedUser()).id,
            invitedById: owner.id,
        }).save();

        await group.remove();

        expect(await GroupMember.count()).toBe(0);
        expect(await GroupInvite.count()).toBe(0);
    });

    it('refuses to delete a user who still owns a group', async () => {
        const owner = await seedUser();
        await seedGroup(owner);

        await expect(owner.remove()).rejects.toThrow(/foreign key constraint/i);
    });

    it('keeps the invite but forgets the inviter when they go', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const admin = await seedUser();
        await seedMember(group, admin, GroupRole.ADMIN);
        const invitee = await seedUser();
        const invite = await GroupInvite.create({
            groupId: group.id,
            invitedUserId: invitee.id,
            invitedById: admin.id,
        }).save();

        await admin.remove();

        expect((await GroupInvite.findOneByOrFail({ id: invite.id })).invitedById).toBeNull();
    });
});

describe('slugify', () => {
    it('turns a name into a link-safe slug', () => {
        expect(slugify('De Bikkels & Co!')).toBe('de-bikkels-co');
        expect(slugify('  Café Zondag  ')).toBe('cafe-zondag');
        expect(slugify('???')).toBe('groep');
    });
});

describe('GroupService', () => {
    it('creates a group with its creator as owner, and a token only for link access', async () => {
        const owner = await seedUser();

        const linked = await GroupService.create(owner, {
            name: 'Vrijdagavond',
            description: 'Borrel',
            access: GroupAccess.INVITE_LINK,
        });
        const closed = await GroupService.create(owner, {
            name: 'Besloten',
            description: null,
            access: GroupAccess.INVITE_ONLY,
        });

        expect(linked.slug).toBe('vrijdagavond');
        expect(linked.inviteToken).toHaveLength(43);
        expect(closed.inviteToken).toBeNull();
        const membership = await GroupMember.findOneByOrFail({
            groupId: linked.id,
            userId: owner.id,
        });
        expect(membership.role).toBe(GroupRole.OWNER);
    });

    it('finds a group only for its members', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const stranger = await seedUser();

        expect((await GroupService.findForMember(group.id, owner))?.id).toBe(group.id);
        expect(await GroupService.findForMember(group.id, stranger)).toBeNull();
    });

    it('lists my groups with my role and the member count', async () => {
        const me = await seedUser();
        const other = await seedUser();
        const mine = await seedGroup(me);
        const theirs = await seedGroup(other);
        await seedMember(theirs, me, GroupRole.ADMIN);
        await seedMember(theirs, await seedUser());
        await seedGroup(other); // not mine

        const listing = await GroupService.listForUser(me);

        expect(listing).toHaveLength(2);
        const byId = new Map(listing.map((l) => [l.id, l]));
        expect(byId.get(mine.id)?.role).toBe(GroupRole.OWNER);
        expect(byId.get(mine.id)?.memberCount).toBe(1);
        expect(byId.get(theirs.id)?.role).toBe(GroupRole.ADMIN);
        expect(byId.get(theirs.id)?.memberCount).toBe(3);
    });

    it('searches public groups by name, paginated, never private ones', async () => {
        const owner = await seedUser();
        await seedGroup(owner, { name: 'Kaartavond', access: GroupAccess.PUBLIC });
        await seedGroup(owner, { name: 'Bordspelkaarten', access: GroupAccess.PUBLIC });
        await seedGroup(owner, { name: 'Kaartclub geheim', access: GroupAccess.INVITE_ONLY });
        await seedGroup(owner, { name: 'Voetbal', access: GroupAccess.PUBLIC });

        const page = await GroupService.searchPublic('kaart', 1, 1);
        expect(page.total).toBe(2);
        expect(page.items).toHaveLength(1);
        expect(page.items[0]?.name).toBe('Bordspelkaarten');
        expect(page.items[0]?.memberCount).toBe(1);

        expect((await GroupService.searchPublic('', 1, 10)).total).toBe(3);
        expect((await GroupService.searchPublic('%', 1, 10)).total).toBe(0);
    });

    it('joins once, through whichever open door', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner, { access: GroupAccess.PUBLIC });
        const joiner = await seedUser();

        const first = await GroupService.join(group, joiner);
        const again = await GroupService.join(group, joiner);

        expect(first.ok).toBe(true);
        expect(again).toEqual({ ok: false, problem: 'ALREADY_MEMBER' });
        expect(await group.memberCount()).toBe(2);
    });

    it('resolves invite links by token, only while link access is on', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner, { access: GroupAccess.INVITE_LINK });
        const token = group.inviteToken ?? '';

        expect((await GroupService.findByInviteToken(token))?.id).toBe(group.id);

        await GroupService.update(group, { access: GroupAccess.INVITE_ONLY });
        expect(await GroupService.findByInviteToken(token)).toBeNull();
        expect((await Group.findOneByOrFail({ id: group.id })).inviteToken).toBeNull();

        await GroupService.update(group, { access: GroupAccess.INVITE_LINK });
        const fresh = (await Group.findOneByOrFail({ id: group.id })).inviteToken ?? '';
        expect(fresh).not.toBe(token);
        expect(fresh).toHaveLength(43);
    });

    it('regenerates the token and refreshes the slug on rename', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner, { access: GroupAccess.INVITE_LINK });
        const token = group.inviteToken;

        await GroupService.regenerateInviteToken(group);
        await GroupService.update(group, { name: 'Nieuwe Naam!' });

        const fresh = await Group.findOneByOrFail({ id: group.id });
        expect(fresh.inviteToken).not.toBe(token);
        expect(fresh.slug).toBe('nieuwe-naam');
        expect(fresh.name).toBe('Nieuwe Naam!');
    });
});
