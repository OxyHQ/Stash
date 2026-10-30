/**
 * Typed domain errors. Every service function throws one of these instead of
 * a bare `Error` or an unstructured string; `middleware/errorHandler.ts` is
 * the one place that maps them to an HTTP status and a typed JSON body.
 */

export class BadRequestError extends Error {}
export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
