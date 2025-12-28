import 'reflect-metadata';
import { config } from 'dotenv';
import { AppDataSource } from './database/data-source';
import { createApp } from './app';
import { logger } from './utils/logger';

// Load environment variables
config();

const PORT = process.env.PORT || 8200;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    // Initialize database
    await AppDataSource.initialize();
    logger.info('Database initialized successfully');

    // Run migrations
    await AppDataSource.runMigrations();
    logger.info('Migrations executed successfully');

    // Create Express app
    const app = createApp();

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📝 API Documentation: http://${HOST}:${PORT}/api-docs`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await AppDataSource.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await AppDataSource.destroy();
  process.exit(0);
});

bootstrap();
