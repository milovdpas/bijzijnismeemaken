import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import UserController from '../../controllers/UserController';
import { publicLimit } from '../../middleware/ApiLimits';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import {
    changePasswordSchema,
    handleAvailableQuerySchema,
    notificationSettingSchema,
    notificationTypeParamSchema,
    searchUsersQuerySchema,
    updateMeSchema,
} from '../../validators/userSchemas';

/**
 * `/me` and `/users/*`. Everything here is behind `userAuth`: the handle check
 * and the search happen during onboarding and inviting, both signed in.
 */
export default class UserRoutes implements IRoute {
    private readonly controller = new UserController();

    getRoutes(): Router {
        const router = Router();

        router.get(API_ENDPOINTS.ME.ROOT, userAuth, this.controller.me);
        router.patch(
            API_ENDPOINTS.ME.ROOT,
            userAuth,
            validate({ body: updateMeSchema }),
            this.controller.updateMe,
        );
        router.patch(
            API_ENDPOINTS.ME.PASSWORD,
            userAuth,
            validate({ body: changePasswordSchema }),
            this.controller.changePassword,
        );
        router.delete(API_ENDPOINTS.ME.ROOT, userAuth, this.controller.deleteMe);

        router.get(
            API_ENDPOINTS.ME.NOTIFICATION_SETTINGS,
            userAuth,
            this.controller.notificationSettings,
        );
        router.put(
            API_ENDPOINTS.ME.NOTIFICATION_SETTING(':type'),
            userAuth,
            validate({ params: notificationTypeParamSchema, body: notificationSettingSchema }),
            this.controller.updateNotificationSetting,
        );

        // Both are typed-into fields: limited so a loop cannot enumerate handles.
        router.get(
            API_ENDPOINTS.USERS.HANDLE_AVAILABLE,
            userAuth,
            publicLimit,
            validate({ query: handleAvailableQuerySchema }),
            this.controller.handleAvailable,
        );
        router.get(
            API_ENDPOINTS.USERS.SEARCH,
            userAuth,
            publicLimit,
            validate({ query: searchUsersQuerySchema }),
            this.controller.search,
        );

        return router;
    }
}
