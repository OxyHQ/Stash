import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { BadRequestError } from '../errors';

/**
 * Parse `req.body` against `schema`, replacing it with the parsed (and
 * possibly defaulted/trimmed) value on success, or forwarding a
 * `BadRequestError` to `errorHandler` on failure.
 */
export function validateBody(
  schema: ZodType,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new BadRequestError(result.error.issues.map((issue) => issue.message).join('; ')));
      return;
    }
    req.body = result.data;
    next();
  };
}
