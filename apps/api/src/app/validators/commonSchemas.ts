import { z } from 'zod';
import { PAGINATION } from '@bzim/types';

/**
 * The `:id` every detail route carries.
 *
 * Worth checking rather than passing straight to a lookup. Without it a
 * malformed id costs a database round trip and comes back as "not found",
 * which sends the caller looking for a deleted record instead of at the id
 * they built wrong.
 */
export const idParamSchema = z.object({
    id: z.uuid(),
});

export const groupIdParamSchema = z.object({
    groupId: z.uuid(),
});

/** `page` and `pageSize` as every paginated list accepts them, with defaults applied. */
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(PAGINATION.MAX_PAGE_SIZE)
        .default(PAGINATION.DEFAULT_PAGE_SIZE),
});
