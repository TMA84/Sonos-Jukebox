import 'reflect-metadata';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../database/data-source';
import { Client } from '../database/entities/client.entity';
import { MediaItem } from '../database/entities/media-item.entity';
import { Config } from '../database/entities/config.entity';
import { logger } from '../utils/logger';

config();

interface OldConfig {
  'node-sonos-http-api': {
    server: string;
    port: string;
  };
  spotify?: {
    clientId: string;
    clientSecret: string;
  };
  clients?: Record<string, { name: string; room: string }>;
}

interface OldMediaItem {
  type: string;
  category: string;
  title: string;
  artist?: string;
  cover?: string;
  spotifyUri?: string;
  spotifyId?: string;
  [key: string]: any;
}

async function migrateFromV2() {
  try {
    logger.info('Starting migration from v2.x to v3.0...');

    // Initialize database
    await AppDataSource.initialize();
    logger.info('Database initialized');

    // Run migrations
    await AppDataSource.runMigrations();
    logger.info('Database migrations completed');

    const configRepo = AppDataSource.getRepository(Config);
    const clientRepo = AppDataSource.getRepository(Client);
    const mediaRepo = AppDataSource.getRepository(MediaItem);

    // Read old config.json
    const oldConfigPath = path.join(__dirname, '../../../server/config/config.json');
    if (!fs.existsSync(oldConfigPath)) {
      logger.warn('No old config.json found, skipping config migration');
    } else {
      const oldConfig: OldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf-8'));
      logger.info('Old config loaded');

      // Migrate Sonos config
      await configRepo.save({
        key: 'sonos_api_host',
        value: oldConfig['node-sonos-http-api'].server,
        description: 'Sonos HTTP API host',
      });
      await configRepo.save({
        key: 'sonos_api_port',
        value: oldConfig['node-sonos-http-api'].port,
        description: 'Sonos HTTP API port',
      });
      logger.info('Sonos configuration migrated');

      // Migrate clients
      if (oldConfig.clients) {
        for (const [clientId, clientData] of Object.entries(oldConfig.clients)) {
          const client = clientRepo.create({
            id: clientId,
            name: clientData.name,
            room: clientData.room,
            enableSpeakerSelection: true,
            isActive: true,
          });
          await clientRepo.save(client);
          logger.info(`Client migrated: ${clientData.name} (${clientId})`);

          // Migrate media items for this client
          const oldDataPath = path.join(
            __dirname,
            `../../../server/config/data-${clientId}.json`
          );
          if (fs.existsSync(oldDataPath)) {
            const oldMediaItems: OldMediaItem[] = JSON.parse(
              fs.readFileSync(oldDataPath, 'utf-8')
            );

            for (const oldItem of oldMediaItems) {
              const mediaItem = mediaRepo.create({
                clientId,
                type: oldItem.type,
                category: oldItem.category,
                title: oldItem.title,
                artist: oldItem.artist,
                cover: oldItem.cover,
                spotifyUri: oldItem.spotifyUri,
                spotifyId: oldItem.spotifyId,
                metadata: oldItem,
                playCount: 0,
              });
              await mediaRepo.save(mediaItem);
            }
            logger.info(`Migrated ${oldMediaItems.length} media items for ${clientData.name}`);
          }
        }
      }
    }

    // Migrate PIN
    const oldPinPath = path.join(__dirname, '../../../server/config/pin.json');
    const defaultPinPath = path.join(__dirname, '../../../server/config/pin-default.json');
    
    let pin = '1234';
    if (fs.existsSync(oldPinPath)) {
      const pinData = JSON.parse(fs.readFileSync(oldPinPath, 'utf-8'));
      pin = pinData.pin;
    } else if (fs.existsSync(defaultPinPath)) {
      const pinData = JSON.parse(fs.readFileSync(defaultPinPath, 'utf-8'));
      pin = pinData.pin;
    }

    await configRepo.save({
      key: 'pin',
      value: pin,
      description: 'PIN for configuration access',
    });
    logger.info('PIN migrated');

    logger.info('✅ Migration completed successfully!');
    logger.info('You can now start the server with: npm start');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateFromV2();
