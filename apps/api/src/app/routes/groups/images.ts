import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import ImageController from '../../controllers/ImageController';
import { publicLimit } from '../../middleware/ApiLimits';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { imageSearchQuerySchema, imageUsedSchema } from '../../validators/imageSchemas';

/** The stock photo search behind the activity form. */
export default class ImageRoutes implements IRoute {
    private readonly controller = new ImageController();

    getRoutes(): Router {
        const router = Router();

        router.get(
            API_ENDPOINTS.IMAGES.SEARCH,
            userAuth,
            publicLimit,
            validate({ query: imageSearchQuerySchema }),
            this.controller.search,
        );
        router.post(
            API_ENDPOINTS.IMAGES.USED,
            userAuth,
            publicLimit,
            validate({ body: imageUsedSchema }),
            this.controller.used,
        );

        return router;
    }
}
