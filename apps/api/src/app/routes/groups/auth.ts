import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import AuthController from '../../controllers/AuthController';
import { publicLimit } from '../../middleware/ApiLimits';

/**
 * Session routes. Neither is behind `userAuth`: refresh is what a browser calls
 * precisely when its access token has expired, and logout must work for a
 * half-dead session too.
 */
export default class AuthRoutes implements IRoute {
    private readonly controller = new AuthController();

    getRoutes(): Router {
        const router = Router();

        router.post(API_ENDPOINTS.AUTH.REFRESH, publicLimit, this.controller.refresh);
        router.post(API_ENDPOINTS.AUTH.LOGOUT, publicLimit, this.controller.logout);

        return router;
    }
}
