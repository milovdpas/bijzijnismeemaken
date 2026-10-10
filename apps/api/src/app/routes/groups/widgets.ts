import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import WidgetController from '../../controllers/WidgetController';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { groupIdParamSchema } from '../../validators/commonSchemas';
import {
    addWidgetSchema,
    reorderWidgetsSchema,
    updateWidgetSchema,
    widgetParamSchema,
} from '../../validators/widgetSchemas';

/** The dashboard's widgets: every member reads them, owner and admins arrange them. */
export default class WidgetRoutes implements IRoute {
    private readonly controller = new WidgetController();

    getRoutes(): Router {
        const router = Router();
        const admin = requireGroupRole(GroupRole.ADMIN);

        router.get(
            API_ENDPOINTS.WIDGETS.LIST(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(GroupRole.MEMBER),
            this.controller.list,
        );
        router.post(
            API_ENDPOINTS.WIDGETS.CREATE(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, body: addWidgetSchema }),
            admin,
            this.controller.add,
        );
        router.put(
            API_ENDPOINTS.WIDGETS.ORDER(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, body: reorderWidgetsSchema }),
            admin,
            this.controller.reorder,
        );
        router.post(
            API_ENDPOINTS.WIDGETS.RESTORE_DEFAULTS(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            admin,
            this.controller.restoreDefaults,
        );
        router.patch(
            API_ENDPOINTS.WIDGETS.DETAIL(':groupId', ':widgetId'),
            userAuth,
            validate({ params: widgetParamSchema, body: updateWidgetSchema }),
            admin,
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.WIDGETS.DETAIL(':groupId', ':widgetId'),
            userAuth,
            validate({ params: widgetParamSchema }),
            admin,
            this.controller.remove,
        );

        return router;
    }
}
