import type { Paginated } from '@bzim/types';

/** Wraps one page of results in the contract every list endpoint shares. */
export function paginate<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
): Paginated<T> {
    return { items, page, pageSize, total, hasMore: page * pageSize < total };
}
