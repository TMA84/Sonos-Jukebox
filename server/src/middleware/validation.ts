import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

export function validateBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return next(new AppError(400, error.details[0].message));
    }
    next();
  };
}

export function validateQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return next(new AppError(400, error.details[0].message));
    }
    next();
  };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}
