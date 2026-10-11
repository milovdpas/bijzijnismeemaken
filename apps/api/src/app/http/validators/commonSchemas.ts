import { DateTime } from 'luxon';
import { z } from 'zod';
import { AVAILABILITY, PAGINATION, TIME_ZONE } from '@bzim/types';

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

/** `from..to`, inclusive, at most `AVAILABILITY.MAX_RANGE_DAYS` apart. Agenda and availability ranges. */
export const rangeQuerySchema = z
    .object({
        from: z.iso.date(),
        to: z.iso.date(),
    })
    .refine((range) => range.from <= range.to, { message: 'from must not be after to' })
    .refine(
        (range) =>
            DateTime.fromISO(range.to, { zone: TIME_ZONE }).diff(
                DateTime.fromISO(range.from, { zone: TIME_ZONE }),
                'days',
            ).days < AVAILABILITY.MAX_RANGE_DAYS,
        { message: `At most ${String(AVAILABILITY.MAX_RANGE_DAYS)} days` },
    );
