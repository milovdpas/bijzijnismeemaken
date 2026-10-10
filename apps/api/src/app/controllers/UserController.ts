import { ERROR_CODES } from '@bzim/types';
import type { HandleAvailableResponse, MeResponse, UserSummary } from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import Group from '../models/Group.entity';
import { SessionService } from '../services/SessionService';
import { UserService } from '../services/UserService';
import { sendConflict, sendError, sendNoContent, sendSuccess } from '../utils/ApiResponses';
import { clearAuthCookies, setAuthCookies } from '../utils/Cookies';
import {
    changePasswordSchema,
    handleAvailableQuerySchema,
    searchUsersQuerySchema,
    updateMeSchema,
} from '../validators/userSchemas';

/** The signed-in user's own account, and the one lookup other members may do. */
export default class UserController {
    me: Handler = (req, res) => {
        sendSuccess<MeResponse>(res, req.user.toDto());
    };

    updateMe: Handler<BodyOf<typeof updateMeSchema>> = async (req, res) => {
        const {
            handle,
            displayName,
            avatarKey,
            locale,
            autoAddToCalendar,
            notifyEmailInvites,
            notifyEmailPlanned,
            notifyEmailNewActivity,
        } = req.body;
        const result = await UserService.update(req.user, {
            handle,
            displayName,
            avatarKey,
            locale,
            autoAddToCalendar,
            notifyEmailInvites,
            notifyEmailPlanned,
            notifyEmailNewActivity,
        });
        if (!result.ok) {
            sendConflict(res, 'That handle is taken', ERROR_CODES.CONFLICT, { field: 'handle' });
            return;
        }
        sendSuccess<MeResponse>(res, result.user.toDto());
    };

    /**
     * Every other session is revoked by the change, so a fresh one is issued
     * for this browser: the person who just changed their password should not
     * be the one who gets signed out.
     */
    changePassword: Handler<BodyOf<typeof changePasswordSchema>> = async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const result = await UserService.changePassword(req.user, currentPassword, newPassword);
        if (!result.ok) {
            const message =
                result.problem === 'CURRENT_REQUIRED'
                    ? 'The current password is required'
                    : 'The current password is wrong';
            sendError(res, ERROR_CODES.INVALID_CREDENTIALS, message, 401);
            return;
        }

        const session = await SessionService.issue(req.user, req.header('user-agent') ?? null);
        setAuthCookies(res, session);
        sendNoContent(res);
    };

    handleAvailable: Handler = async (req, res) => {
        const { handle } = queryOf(req, handleAvailableQuerySchema);
        const available = await UserService.handleAvailable(handle, req.user);
        sendSuccess<HandleAvailableResponse>(res, { available });
    };

    search: Handler = async (req, res) => {
        const { q } = queryOf(req, searchUsersQuerySchema);
        const users = await UserService.search(q, req.user);
        sendSuccess<UserSummary[]>(
            res,
            users.flatMap((user) => {
                const summary = user.toSummary();
                return summary === null ? [] : [summary];
            }),
        );
    };

    /** Refused while the person still owns a group: somebody has to take it over first. */
    deleteMe: Handler = async (req, res) => {
        if ((await Group.countOwnedBy(req.user)) > 0) {
            sendConflict(res, 'Transfer ownership first', ERROR_CODES.OWNER_MUST_TRANSFER);
            return;
        }
        await UserService.deleteAccount(req.user);
        clearAuthCookies(res);
        sendNoContent(res);
    };
}
