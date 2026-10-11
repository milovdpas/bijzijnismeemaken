import type { GroupWidgetDto } from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { paramsOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { WidgetService } from '../../domain/services/WidgetService';
import {
    sendConflict,
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import {
    addWidgetSchema,
    reorderWidgetsSchema,
    updateWidgetSchema,
    widgetParamSchema,
    widgetSpecSchema,
} from '../validators/widgetSchemas';

/**
 * The dashboard's widget list. Reading is every member's; changing it runs
 * behind `requireGroupRole(ADMIN)`.
 */
export default class WidgetController {
    list: Handler = async (req, res) => {
        sendSuccess<GroupWidgetDto[]>(
            res,
            (await WidgetService.list(req.group)).map((widget) => widget.toDto()),
        );
    };

    add: Handler<BodyOf<typeof addWidgetSchema>> = async (req, res) => {
        const result = await WidgetService.add(req.group, req.user, req.body);
        if (!result.ok) {
            switch (result.problem) {
                case 'TOO_MANY':
                    sendConflict(res, 'The dashboard is full', undefined, { problem: 'TOO_MANY' });
                    return;
                case 'TARGET_NOT_FOUND':
                    sendValidationFailed(res, 'That target is not in this group', {
                        problem: 'TARGET_NOT_FOUND',
                    });
                    return;
            }
        }
        sendSuccess<GroupWidgetDto>(res, result.widget.toDto(), 201);
    };

    /** The new config must fit the widget's own type, which only the stored row knows. */
    update: Handler<BodyOf<typeof updateWidgetSchema>> = async (req, res) => {
        const { widgetId } = paramsOf(req, widgetParamSchema);
        const widget = await WidgetService.findForGroup(req.group, widgetId);
        if (widget === null) {
            sendNotFound(res, 'Widget');
            return;
        }
        const { config } = req.body;
        const spec = widgetSpecSchema.safeParse({ type: widget.type, config });
        if (!spec.success) {
            sendValidationFailed(res, 'Request is not valid', spec.error.issues);
            return;
        }
        const result = await WidgetService.update(req.group, widget, spec.data);
        if (!result.ok) {
            sendValidationFailed(res, 'That target is not in this group', {
                problem: result.problem,
            });
            return;
        }
        sendSuccess<GroupWidgetDto>(res, result.widget.toDto());
    };

    remove: Handler = async (req, res) => {
        const { widgetId } = paramsOf(req, widgetParamSchema);
        const widget = await WidgetService.findForGroup(req.group, widgetId);
        if (widget === null) {
            sendNotFound(res, 'Widget');
            return;
        }
        await WidgetService.remove(widget);
        sendNoContent(res);
    };

    reorder: Handler<BodyOf<typeof reorderWidgetsSchema>> = async (req, res) => {
        const { widgetIds } = req.body;
        if (!(await WidgetService.reorder(req.group, widgetIds))) {
            sendValidationFailed(res, 'The ids are not exactly this dashboard', {
                problem: 'NOT_A_PERMUTATION',
            });
            return;
        }
        sendSuccess<GroupWidgetDto[]>(
            res,
            (await WidgetService.list(req.group)).map((widget) => widget.toDto()),
        );
    };

    restoreDefaults: Handler = async (req, res) => {
        sendSuccess<GroupWidgetDto[]>(
            res,
            (await WidgetService.restoreDefaults(req.group, req.user)).map((widget) =>
                widget.toDto(),
            ),
        );
    };
}
