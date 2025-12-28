import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error-handler';

export interface AuthRequest extends Request {
  userId?: string;
  clientId?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError(401, 'Access token required'));
  }

  try {
    const secret = process.env.JWT_SECRET || 'change-this-secret';
    const decoded = jwt.verify(token, secret) as { userId: string; clientId: string };
    
    req.userId = decoded.userId;
    req.clientId = decoded.clientId;
    next();
  } catch (error) {
    return next(new AppError(403, 'Invalid or expired token'));
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'change-this-secret';
      const decoded = jwt.verify(token, secret) as { userId: string; clientId: string };
      req.userId = decoded.userId;
      req.clientId = decoded.clientId;
    } catch (error) {
      // Token invalid but continue anyway
    }
  }

  next();
}
