import 'reflect-metadata';
import { config } from 'dotenv';
import { AppDataSource } from '../data-source';
import { logger } from '../../utils/logger';

config();

async function runMigrations() {
  try {
    logger.info('Initializing database connection...');
    await AppDataSource.initialize();
    
    logger.info('Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    
    if (migrations.length === 0) {
      logger.info('No migrations to run');
    } else {
      logger.info(`Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        logger.info(`  - ${migration.name}`);
      });
    }
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
