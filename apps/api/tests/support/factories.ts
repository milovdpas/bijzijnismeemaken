import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { DeepPartial } from 'typeorm';
import { GroupAccess, GroupRole, Locale, slugify } from '@bzim/types';

import Group from '../../src/app/models/Group.entity';
import GroupMember from '../../src/app/models/GroupMember.entity';
import User from '../../src/app/models/User.entity';

import { generateToken } from '../../src/app/utils/Token';

/**
 * Seed helpers, written through the entities rather than raw SQL.
 *
 * Going through TypeORM means a column rename breaks the factories at compile
 * time instead of at the first assertion, and the fixtures cannot drift into a
 * shape the application could never produce.
 *
 * Every helper takes overrides so a test can state only the thing it is about.
 * A test that reads `seedGroup(owner, { access: GroupAccess.PUBLIC })` says
 * what it cares about; one that spells out six fields hides it.
 */

let counter = 0;

/** A user who has finished onboarding. Each call gets its own unique fields. */
export async function seedUser(overrides: DeepPartial<User> = {}): Promise<User> {
    counter += 1;
    const n = String(counter).padStart(3, '0');
    const user = User.create({
        googleSub: `google-sub-${randomUUID()}`,
        email: `user${n}-${randomUUID().slice(0, 8)}@example.com`,
        handle: `user${n}_${randomUUID().slice(0, 6)}`,
        displayName: `User ${n}`,
        avatarKey: 'cat',
        passwordHash: null,
        emailVerifiedAt: DateTime.utc().toJSDate(),
        locale: Locale.NL,
        lastLoginAt: DateTime.utc().toJSDate(),
    });
    Object.assign(user, overrides);
    return user.save();
}

/** A group with its owner membership, as `GroupService.create` would make it. */
export async function seedGroup(owner: User, overrides: DeepPartial<Group> = {}): Promise<Group> {
    counter += 1;
    const name = `Group ${String(counter)}`;
    const access = overrides.access ?? GroupAccess.INVITE_ONLY;
    const group = Group.create({
        name,
        slug: slugify(name),
        description: null,
        access,
        inviteToken: access === GroupAccess.INVITE_LINK ? generateToken() : null,
        ownerId: owner.id,
    });
    Object.assign(group, overrides);
    // The slug follows whatever name the override chose, as the service would.
    group.slug = overrides.slug ?? slugify(group.name);
    await group.save();
    await GroupMember.create({ groupId: group.id, userId: owner.id, role: GroupRole.OWNER }).save();
    return group;
}

export async function seedMember(
    group: Group,
    user: User,
    role: GroupRole = GroupRole.MEMBER,
): Promise<GroupMember> {
    return GroupMember.create({ groupId: group.id, userId: user.id, role }).save();
}
