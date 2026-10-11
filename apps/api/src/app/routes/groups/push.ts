import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import PushController from '../../controllers/PushController';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import {
    createPushSubscriptionSchema,
    pushSubscriptionParamSchema,
} from '../../validators/pushSchemas';

/** `/me/push-subscriptions`: the devices that get push notifications. */
export default class PushRoutes implements IRoute {
    private readonly controller = new PushController();

    getRoutes(): Router {
        const router = Router();

        router.get(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, userAuth, this.controller.list);
        router.post(
            API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS,
            userAuth,
            validate({ body: createPushSubscriptionSchema }),
            this.controller.subscribe,
        );
        router.delete(
            API_ENDPOINTS.ME.PUSH_SUBSCRIPTION(':subscriptionId'),
            userAuth,
            validate({ params: pushSubscriptionParamSchema }),
            this.controller.unsubscribe,
        );

        return router;
    }
}
