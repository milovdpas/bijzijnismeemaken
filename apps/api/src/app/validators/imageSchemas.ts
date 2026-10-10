import { z } from 'zod';
import { IMAGES } from '@bzim/types';

export const imageSearchQuerySchema = z.object({
    q: z.string().trim().min(IMAGES.QUERY_MIN_LENGTH).max(IMAGES.QUERY_MAX_LENGTH),
    page: z.coerce.number().int().min(1).max(50).default(1),
});

export const imageUsedSchema = z.object({
    useToken: z.url().max(500),
});
