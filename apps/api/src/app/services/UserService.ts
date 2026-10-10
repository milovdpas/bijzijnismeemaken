import { Like, Not } from 'typeorm';
import { PROFILE } from '@bzim/types';
import type { UpdateMeRequest } from '@bzim/types';

import User from '../models/User.entity';
import { escapeLike } from '../utils/Database';
import { normalizeHandle } from '../utils/Normalize';
import { hashPassword, verifyPassword } from '../utils/Password';
import { SessionService } from './SessionService';

export type UpdateResult = { ok: true; user: User } | { ok: false; problem: 'HANDLE_TAKEN' };

export type ChangePasswordResult =
    { ok: true } | { ok: false; problem: 'CURRENT_REQUIRED' | 'CURRENT_WRONG' };

/** How many matches a handle search returns; a picker, not a directory. */
const SEARCH_LIMIT = 10;

export class UserService {
    /**
     * Profile and preferences. Onboarding is the same call with the three
     * profile fields; nothing distinguishes it on the server, which is why the
     * web app can also let a person change their handle later.
     */
    static async update(user: User, patch: UpdateMeRequest): Promise<UpdateResult> {
        if (patch.handle !== undefined && patch.handle !== user.handle) {
            const taken = await User.existsBy({ handle: patch.handle, id: Not(user.id) });
            if (taken) {
                return { ok: false, problem: 'HANDLE_TAKEN' };
            }
            user.handle = patch.handle;
        }
        if (patch.displayName !== undefined) user.displayName = patch.displayName;
        if (patch.avatarKey !== undefined) user.avatarKey = patch.avatarKey;
        if (patch.locale !== undefined) user.locale = patch.locale;
        if (patch.autoAddToCalendar !== undefined) user.autoAddToCalendar = patch.autoAddToCalendar;

        await user.save();
        return { ok: true, user };
    }

    /**
     * Sets or changes the password and signs out every other session.
     *
     * The current password is required when there is one: a stolen cookie
     * must not be enough to lock the owner out. A Google-only account has
     * none, so it may set one freely; that is how it gains the second method.
     */
    static async changePassword(
        user: User,
        currentPassword: string | undefined,
        newPassword: string,
    ): Promise<ChangePasswordResult> {
        if (user.passwordHash !== null) {
            if (currentPassword === undefined) {
                return { ok: false, problem: 'CURRENT_REQUIRED' };
            }
            if (!(await verifyPassword(currentPassword, user.passwordHash))) {
                return { ok: false, problem: 'CURRENT_WRONG' };
            }
        }

        user.passwordHash = await hashPassword(newPassword);
        await user.save();
        await SessionService.revokeAllForUser(user.id);
        return { ok: true };
    }

    /** False for a taken handle and for one that could never be valid. */
    static async handleAvailable(raw: string, forUser: User): Promise<boolean> {
        const handle = normalizeHandle(raw);
        if (
            handle.length < PROFILE.HANDLE_MIN_LENGTH ||
            handle.length > PROFILE.HANDLE_MAX_LENGTH ||
            !PROFILE.HANDLE_PATTERN.test(handle)
        ) {
            return false;
        }
        return !(await User.existsBy({ handle, id: Not(forUser.id) }));
    }

    /**
     * People to invite, by the start of their handle. Only onboarded users,
     * because a handle is the thing being matched, and never the caller.
     */
    static async search(prefix: string, caller: User): Promise<User[]> {
        return User.find({
            where: { handle: Like(`${escapeLike(prefix)}%`), id: Not(caller.id) },
            order: { handle: 'ASC' },
            take: SEARCH_LIMIT,
        });
    }

    /**
     * Deletes the account. Group decoupling (snapshots, ownership checks)
     * arrives with the groups in task 30; until then the row and everything
     * cascading from it simply go.
     */
    static async deleteAccount(user: User): Promise<void> {
        await SessionService.revokeAllForUser(user.id);
        await user.remove();
    }
}
