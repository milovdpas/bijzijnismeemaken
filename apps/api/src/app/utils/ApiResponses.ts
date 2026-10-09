import type { Response } from 'express';
import { ERROR_CODES } from '@bzim/types';
import type { ApiErrorResponse, ErrorCode } from '@bzim/types';

/**
 * How every response leaves this API.
 *
 * **A successful response is the resource, unwrapped.** The status code already
 * says whether it worked, so a `success` flag would restate it and a `data`
 * field would make every caller unwrap a level to reach anything. A failure is
 * a flat `{ code, message, details }` with a 4xx or 5xx, for the same reason.
 *
 * **Nothing here throws, and neither does anything that calls it.** A refused
 * request is an ordinary outcome, not an exception: a group that does not
 * exist, a payload that is wrong, a score an editor may not change. Services
 * return those outcomes and controllers render them, so the path a request
 * takes is visible in the code rather than in whatever a `catch` somewhere else
 * decides to do with it.
 *
 * Exceptions are left for the cases where the code itself is wrong. Those reach
 * `errorHandler` and become a 500.
 */

/**
 * Sends the resource, against a response type that must be named.
 *
 * The type argument is deliberately impossible to infer. `sendSuccess(res, x)`
 * with an inferred `T` can never fail, because the argument is what defines the
 * expectation, so the check is circular and the compiler waves through any
 * shape at all. `NoInfer` blocks that inference and the `never` default makes
 * omitting the type a compile error, which leaves exactly one way to call this:
 *
 * ```ts
 * sendSuccess<GroupResponse>(res, group.toDto());
 * ```
 *
 * Now the mapper's output has to satisfy what the endpoint promised, and the
 * web app imports that same name to parse it. Renaming a field in `@bzim/types`
 * breaks the API and the app together, at build time, rather than becoming a
 * screen that renders `undefined`.
 */
export function sendSuccess<T = never>(res: Response, data: NoInfer<T>, status = 200): void {
    res.status(status).json(data);
}

export function sendError(
    res: Response,
    code: ErrorCode,
    message: string,
    status = 400,
    details?: unknown,
): void {
    const body: ApiErrorResponse = { code, message, details };
    res.status(status).json(body);
}

/**
 * Also the answer for a resource the caller may not see.
 *
 * A 403 would confirm the id exists to anyone holding any token. Membership is
 * part of the lookup rather than checked after it, so a real id in somebody
 * else's group and an invented one are indistinguishable, which from the
 * caller's side they are.
 */
export function sendNotFound(res: Response, what: string): void {
    sendError(res, ERROR_CODES.NOT_FOUND, `${what} not found`, 404);
}

export function sendUnauthenticated(res: Response): void {
    sendError(res, ERROR_CODES.UNAUTHENTICATED, 'Missing or invalid access token', 401);
}

/**
 * Known, and not allowed for this caller.
 *
 * Only for actions inside a group the caller belongs to, where the resource is
 * already visible to them and a 404 would be a lie: a member editing another
 * member's activity, an editor touching a locked month.
 */
export function sendForbidden(res: Response, message: string): void {
    sendError(res, ERROR_CODES.FORBIDDEN, message, 403);
}

export function sendValidationFailed(res: Response, message: string, details?: unknown): void {
    sendError(res, ERROR_CODES.VALIDATION_FAILED, message, 422, details);
}

/**
 * Understood and refused because of current state, such as joining a group
 * twice or claiming a handle somebody holds.
 *
 * Distinct from a 422: nothing about the payload is wrong, so telling the app
 * to fix its input would send it in circles. The `code` defaults to `CONFLICT`
 * and can be a more specific one (`OWNER_MUST_TRANSFER`) when the app needs to
 * show a different screen.
 *
 * The `message` is for whoever is reading a log or a failing test. The app
 * never shows it: it renders from the code, in the language its owner chose.
 */
export function sendConflict(
    res: Response,
    message: string,
    code: ErrorCode = ERROR_CODES.CONFLICT,
    details?: unknown,
): void {
    sendError(res, code, message, 409, details);
}
