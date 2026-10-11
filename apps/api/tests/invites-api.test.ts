import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    API_ENDPOINTS,
    ERROR_CODES,
    GroupAccess,
    GroupRole,
    Locale,
    NotificationType,
} from '@bzim/types';
import type { GroupDetailResponse, GroupInviteDto } from '@bzim/types';

import GroupInvite from '../src/app/domain/models/GroupInvite.entity';
import GroupMember from '../src/app/domain/models/GroupMember.entity';
import NotificationSetting from '../src/app/domain/models/NotificationSetting.entity';
import { mailer } from '../src/app/infrastructure/modules/mail';
import type { MailMessage } from '../src/app/infrastructure/modules/mail';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import { seedGroup, seedMember, seedUser } from './support/factories';

function outbox(): MailMessage[] {
    const sent: MailMessage[] = [];
    vi.spyOn(mailer, 'send').mockImplementation((message) => {
        sent.push(message);
        return Promise.resolve();
    });
    return sent;
}

async function setup() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner, { name: 'Kaartavond' });
    const admin = await seedUser();
    await seedMember(group, admin, GroupRole.ADMIN);
    const member = await seedUser();
    await seedMember(group, member);
    const invitee = await seedUser({ handle: 'anna', locale: Locale.EN });
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asAdmin = asUser((await sessionFor(admin)).accessToken);
    const asMember = asUser((await sessionFor(member)).accessToken);
    const asInvitee = asUser((await sessionFor(invitee)).accessToken);
    return { owner, group, admin, member, invitee, asOwner, asAdmin, asMember, asInvitee };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('POST /groups/:groupId/invites', () => {
    it('invites by handle and emails the invitee in their language', async () => {
        const sent = outbox();
        const { group, invitee, asOwner } = await setup();

        const response = await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), {
            handle: ' ANNA ',
        });

        expect(response.status).toBe(201);
        const invite = data<GroupInviteDto>(response);
        expect(invite.group).toEqual({ id: group.id, name: 'Kaartavond' });
        expect(invite.invitedUser.id).toBe(invitee.id);
        expect(invite.invitedBy?.displayName).toBe('Milo');

        expect(sent).toHaveLength(1);
        expect(sent[0]?.to).toBe(invitee.email);
        expect(sent[0]?.subject).toBe('Milo invited you to Kaartavond');
        expect(sent[0]?.text).toContain('/invites');
    });

    it("respects the invitee's email preference", async () => {
        const sent = outbox();
        const { group, invitee, asAdmin } = await setup();
        await NotificationSetting.create({
            userId: invitee.id,
            type: NotificationType.GROUP_INVITE,
            email: false,
            push: false,
        }).save();

        expect(
            (await asAdmin.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' })).status,
        ).toBe(201);
        expect(sent).toHaveLength(0);
        expect(await GroupInvite.countBy({ groupId: group.id })).toBe(1);
    });

    it('refuses unknown handles, members, duplicates, and non-admins', async () => {
        outbox();
        const { group, member, asOwner, asMember } = await setup();

        const unknown = await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), {
            handle: 'nobody',
        });
        expect(unknown.status).toBe(404);

        const already = await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), {
            handle: member.handle,
        });
        expect(already.status).toBe(409);
        expect(error(already).details).toEqual({ reason: 'member' });

        await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' });
        const twice = await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), {
            handle: 'anna',
        });
        expect(twice.status).toBe(409);
        expect(error(twice).details).toEqual({ reason: 'invited' });

        expect(
            (await asMember.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }))
                .status,
        ).toBe(403);
    });
});

describe('listing and cancelling', () => {
    it('shows admins the pending invites and lets them cancel', async () => {
        outbox();
        const { group, asOwner, asMember } = await setup();
        const invite = data<GroupInviteDto>(
            await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }),
        );

        const pending = data<GroupInviteDto[]>(
            await asOwner.get(API_ENDPOINTS.GROUPS.INVITES(group.id)),
        );
        expect(pending.map((i) => i.id)).toEqual([invite.id]);
        expect((await asMember.get(API_ENDPOINTS.GROUPS.INVITES(group.id))).status).toBe(403);

        expect(
            (await asOwner.delete(API_ENDPOINTS.GROUPS.INVITE(group.id, invite.id))).status,
        ).toBe(204);
        expect(
            (await asOwner.delete(API_ENDPOINTS.GROUPS.INVITE(group.id, invite.id))).status,
        ).toBe(404);
        expect(await GroupInvite.count()).toBe(0);
    });

    it("does not let one group cancel another group's invite", async () => {
        outbox();
        const { group, asOwner, owner } = await setup();
        const other = await seedGroup(owner, { name: 'Other' });
        const invite = data<GroupInviteDto>(
            await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }),
        );

        expect(
            (await asOwner.delete(API_ENDPOINTS.GROUPS.INVITE(other.id, invite.id))).status,
        ).toBe(404);
        expect(await GroupInvite.count()).toBe(1);
    });
});

describe('the invitee', () => {
    it('sees their invites, accepts one, and is then a member', async () => {
        outbox();
        const { group, invitee, asOwner, asInvitee } = await setup();
        const invite = data<GroupInviteDto>(
            await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }),
        );

        const mine = data<GroupInviteDto[]>(await asInvitee.get(API_ENDPOINTS.INVITES.LIST));
        expect(mine.map((i) => i.id)).toEqual([invite.id]);
        expect(mine[0]?.invitedBy?.displayName).toBe('Milo');

        const accepted = await asInvitee.post(API_ENDPOINTS.INVITES.ACCEPT(invite.id));
        expect(accepted.status).toBe(201);
        const detail = data<GroupDetailResponse>(accepted);
        expect(detail.id).toBe(group.id);
        expect(detail.role).toBe(GroupRole.MEMBER);
        expect(detail.memberCount).toBe(4);

        expect(await GroupMember.existsBy({ groupId: group.id, userId: invitee.id })).toBe(true);
        expect(await GroupInvite.countBy({ id: invite.id })).toBe(0);
        expect((await asInvitee.post(API_ENDPOINTS.INVITES.ACCEPT(invite.id))).status).toBe(404);
    });

    it('is answered by joining another way, and accepting as a member is no error', async () => {
        outbox();
        const owner = await seedUser();
        const group = await seedGroup(owner, { access: GroupAccess.PUBLIC });
        const anna = await seedUser({ handle: 'anna' });
        const asOwner = asUser((await sessionFor(owner)).accessToken);
        const asAnna = asUser((await sessionFor(anna)).accessToken);
        const invite = data<GroupInviteDto>(
            await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }),
        );

        // Anna finds the group herself and joins: the invite is answered.
        expect((await asAnna.post(API_ENDPOINTS.GROUPS.JOIN(group.id))).status).toBe(201);
        expect(await GroupInvite.countBy({ id: invite.id })).toBe(0);
        expect(data<GroupInviteDto[]>(await asAnna.get(API_ENDPOINTS.INVITES.LIST))).toEqual([]);

        // An invite that somehow outlived the membership still accepts cleanly.
        const stale = await GroupInvite.create({
            groupId: group.id,
            invitedUserId: anna.id,
            invitedById: owner.id,
        }).save();
        expect((await asAnna.post(API_ENDPOINTS.INVITES.ACCEPT(stale.id))).status).toBe(201);
        expect(await GroupInvite.countBy({ id: stale.id })).toBe(0);
        expect(await GroupMember.countBy({ groupId: group.id, userId: anna.id })).toBe(1);
    });

    it('can decline, and nobody else can answer their invite', async () => {
        outbox();
        const { group, invitee, asOwner, asInvitee, asMember } = await setup();
        const invite = data<GroupInviteDto>(
            await asOwner.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }),
        );

        expect((await asMember.post(API_ENDPOINTS.INVITES.DECLINE(invite.id))).status).toBe(404);
        expect((await asMember.post(API_ENDPOINTS.INVITES.ACCEPT(invite.id))).status).toBe(404);

        expect((await asInvitee.post(API_ENDPOINTS.INVITES.DECLINE(invite.id))).status).toBe(204);
        expect(await GroupInvite.count()).toBe(0);
        expect(await GroupMember.existsBy({ groupId: group.id, userId: invitee.id })).toBe(false);
    });

    it('still works when the inviter has left the group', async () => {
        outbox();
        const { group, admin, asAdmin, asInvitee } = await setup();
        const invite = data<GroupInviteDto>(
            await asAdmin.post(API_ENDPOINTS.GROUPS.INVITES(group.id), { handle: 'anna' }),
        );
        await admin.remove();

        const mine = data<GroupInviteDto[]>(await asInvitee.get(API_ENDPOINTS.INVITES.LIST));
        expect(mine[0]?.invitedBy).toBeNull();
        expect((await asInvitee.post(API_ENDPOINTS.INVITES.ACCEPT(invite.id))).status).toBe(201);
    });

    it('gets a plain not-found for an invite that does not exist', async () => {
        const { asInvitee } = await setup();
        const response = await asInvitee.post(
            API_ENDPOINTS.INVITES.ACCEPT('00000000-0000-4000-8000-000000000000'),
        );
        expect(response.status).toBe(404);
        expect(error(response).code).toBe(ERROR_CODES.NOT_FOUND);
    });
});
