import type { PushSubscriptionDto, PushSubscriptionsResponse } from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { paramsOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { PushService } from '../services/PushService';
import { sendNoContent, sendNotFound, sendSuccess } from '../utils/ApiResponses';
import {
    createPushSubscriptionSchema,
    pushSubscriptionParamSchema,
} from '../validators/pushSchemas';

/** The signed-in person's push devices. */
export default class PushController {
    list: Handler = async (req, res) => {
        const rows = await PushService.list(req.user);
        sendSuccess<PushSubscriptionsResponse>(res, {
            publicKey: PushService.publicKey(),
            subscriptions: rows.map((row) => row.toDto()),
        });
    };

    subscribe: Handler<BodyOf<typeof createPushSubscriptionSchema>> = async (req, res) => {
        const { endpoint, keys } = req.body;
        const row = await PushService.subscribe(
            req.user,
            { endpoint, keys },
            req.header('user-agent')?.slice(0, 255) ?? null,
        );
        sendSuccess<PushSubscriptionDto>(res, row.toDto(), 201);
    };

    unsubscribe: Handler = async (req, res) => {
        const { subscriptionId } = paramsOf(req, pushSubscriptionParamSchema);
        if (!(await PushService.unsubscribe(req.user, subscriptionId))) {
            sendNotFound(res, 'Push subscription');
            return;
        }
        sendNoContent(res);
    };
}
