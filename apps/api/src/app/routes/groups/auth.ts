import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import AuthController from '../../controllers/AuthController';
import {
    loginAddressLimit,
    loginEmailLimit,
    publicLimit,
    registerLimit,
} from '../../middleware/ApiLimits';
import { validate } from '../../middleware/ValidateRequest';
import {
    googleCallbackQuerySchema,
    googleStartQuerySchema,
    loginSchema,
    registerSchema,
} from '../../validators/authSchemas';

/**
 * Sign-in routes. None is behind `userAuth`: they are how a session begins,
 * and refresh is what a browser calls precisely when its access token has
 * expired.
 */
export default class AuthRoutes implements IRoute {
    private readonly controller = new AuthController();

    getRoutes(): Router {
        const router = Router();

        router.get(
            API_ENDPOINTS.AUTH.GOOGLE,
            publicLimit,
            validate({ query: googleStartQuerySchema }),
            this.controller.googleStart,
        );
        router.get(
            API_ENDPOINTS.AUTH.GOOGLE_CALLBACK,
            publicLimit,
            validate({ query: googleCallbackQuerySchema }),
            this.controller.googleCallback,
        );

        router.post(
            API_ENDPOINTS.AUTH.REGISTER,
            registerLimit,
            validate({ body: registerSchema }),
            this.controller.register,
        );
        // The email limit runs after validation so it keys on a normalised
        // address rather than whatever casing the caller chose.
        router.post(
            API_ENDPOINTS.AUTH.LOGIN,
            loginAddressLimit,
            validate({ body: loginSchema }),
            loginEmailLimit,
            this.controller.login,
        );

        router.post(API_ENDPOINTS.AUTH.REFRESH, publicLimit, this.controller.refresh);
        router.post(API_ENDPOINTS.AUTH.LOGOUT, publicLimit, this.controller.logout);

        return router;
    }
}
