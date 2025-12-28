import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { rateLimit } from 'express-rate-limit';
import { logger, morganStream } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';
import { swaggerSpec } from './config/swagger';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for Ionic app
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Compression
  app.use(compression());

  // Request logging
  app.use(morgan('combined', { stream: morganStream }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api', apiRouter);

  // Serve static files from Ionic app
  app.use(express.static(path.join(__dirname, '../../www')));

  // Catch all routes and return the index file
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../www/index.html'));
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
