import { DataSource } from 'typeorm';
import path from 'path';
import { User } from './entities/user.entity';
import { Client } from './entities/client.entity';
import { MediaItem } from './entities/media-item.entity';
import { Config } from './entities/config.entity';

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DATABASE_PATH || './server/data/database.sqlite',
  synchronize: false, // Use migrations instead
  logging: !isProduction,
  entities: [User, Client, MediaItem, Config],
  migrations: [path.join(__dirname, 'migrations/*.ts')],
  subscribers: [],
});
