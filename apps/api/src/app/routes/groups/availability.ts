import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import AvailabilityController from '../../controllers/AvailabilityController';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import {
    createRuleSchema,
    groupAvailabilityQuerySchema,
    ruleIdParamSchema,
    unavailabilitySchema,
    updateRuleSchema,
} from '../../validators/availabilitySchemas';
import { groupIdParamSchema, rangeQuerySchema } from '../../validators/commonSchemas';

/** The caller's own availability and blocks, and the group's matrix. */
export default class AvailabilityRoutes implements IRoute {
    private readonly controller = new AvailabilityController();

    getRoutes(): Router {
        const router = Router();

        router.get(
            API_ENDPOINTS.ME.AVAILABILITY,
            userAuth,
            validate({ query: rangeQuerySchema }),
            this.controller.mine,
        );
        router.get(
            API_ENDPOINTS.ME.UNAVAILABILITY,
            userAuth,
            validate({ query: rangeQuerySchema }),
            this.controller.listBlocks,
        );
        router.put(
            API_ENDPOINTS.ME.UNAVAILABILITY,
            userAuth,
            validate({ body: unavailabilitySchema }),
            this.controller.addBlock,
        );
        router.delete(
            API_ENDPOINTS.ME.UNAVAILABILITY,
            userAuth,
            validate({ body: unavailabilitySchema }),
            this.controller.removeBlock,
        );

        router.get(API_ENDPOINTS.ME.UNAVAILABILITY_RULES, userAuth, this.controller.listRules);
        router.post(
            API_ENDPOINTS.ME.UNAVAILABILITY_RULES,
            userAuth,
            validate({ body: createRuleSchema }),
            this.controller.createRule,
        );
        router.patch(
            API_ENDPOINTS.ME.UNAVAILABILITY_RULE(':ruleId'),
            userAuth,
            validate({ params: ruleIdParamSchema, body: updateRuleSchema }),
            this.controller.updateRule,
        );
        router.delete(
            API_ENDPOINTS.ME.UNAVAILABILITY_RULE(':ruleId'),
            userAuth,
            validate({ params: ruleIdParamSchema }),
            this.controller.deleteRule,
        );

        router.get(
            API_ENDPOINTS.GROUPS.AVAILABILITY(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, query: groupAvailabilityQuerySchema }),
            requireGroupRole(GroupRole.MEMBER),
            this.controller.group,
        );

        return router;
    }
}
