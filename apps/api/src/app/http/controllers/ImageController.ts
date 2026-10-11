import { ERROR_CODES } from '@bzim/types';
import type { ImageSearchResponse } from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { UnsplashClient } from '../../infrastructure/modules/images/UnsplashClient';
import { sendError, sendNoContent, sendSuccess, sendValidationFailed } from '../utils/ApiResponses';
import { imageSearchQuerySchema, imageUsedSchema } from '../validators/imageSchemas';

/** Stock photos for the activity form. Signed-in only and rate limited: every call spends provider quota. */
export default class ImageController {
    search: Handler = async (req, res) => {
        const { q, page } = queryOf(req, imageSearchQuerySchema);
        if (!UnsplashClient.configured()) {
            sendError(res, ERROR_CODES.PROVIDER_ERROR, 'Image search is not configured', 503);
            return;
        }
        try {
            sendSuccess<ImageSearchResponse>(
                res,
                await UnsplashClient.search(q, page, req.user.locale),
            );
        } catch (error) {
            console.error('Image search failed:', error);
            sendError(res, ERROR_CODES.PROVIDER_ERROR, 'Image search failed', 502);
        }
    };

    /** The person picked a photo. Best effort: a failed ping must not fail the form. */
    used: Handler<BodyOf<typeof imageUsedSchema>> = async (req, res) => {
        const { useToken } = req.body;
        if (!UnsplashClient.isUseToken(useToken)) {
            sendValidationFailed(res, 'Not a photo of ours');
            return;
        }
        if (UnsplashClient.configured()) {
            try {
                await UnsplashClient.markUsed(useToken);
            } catch (error) {
                console.error('Image use ping failed:', error);
            }
        }
        sendNoContent(res);
    };
}
