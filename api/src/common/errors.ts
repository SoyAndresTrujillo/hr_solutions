import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logger } from './logger.js';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export const notFound: RequestHandler = () => {
  throw new HttpError(404, 'Not Found');
};

export function errorHandler(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  logger.error(err);
  res.status(500).json({ error: { message: 'Internal Server Error' } });
}
