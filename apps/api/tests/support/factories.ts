import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { DeepPartial } from 'typeorm';
import { Locale } from '@bzim/types';

import User from '../../src/app/models/User.entity';

/**
 * Seed helpers, written through the entities rather than raw SQL.
 *
 * Going through TypeORM means a column rename breaks the factories at compile
 * time instead of at the first assertion, and the fixtures cannot drift into a
 * shape the application could never produce.
 *
 * Every helper takes overrides so a test can state only the thing it is about.
 * A test that reads `seedUser({ handle: null })` says what it cares about; one
 * that spells out eight fields hides it.
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
