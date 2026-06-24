import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { MediaModule } from './modules/media/media.module';
import { SonosModule } from './modules/sonos/sonos.module';
import { SpotifyModule } from './modules/spotify/spotify.module';
import { TuneInModule } from './modules/tunein/tunein.module';
import { AlarmsModule } from './modules/alarms/alarms.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AutoplayModule } from './modules/autoplay/autoplay.module';
import { SleepTimerModule } from './modules/sleep-timer/sleep-timer.module';
import { AppConfigModule } from './modules/config/app-config.module';
import { HealthModule } from './modules/health/health.module';
import { MigrationModule } from './modules/migration/migration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [
        () => ({
          port: parseInt(process.env['PORT'] ?? '8200', 10),
          database: {
            path: process.env['DATABASE_PATH'] ?? './data/sonos-jukebox.db',
          },
          spotify: {
            clientId: process.env['SPOTIFY_CLIENT_ID'] ?? '',
            clientSecret: process.env['SPOTIFY_CLIENT_SECRET'] ?? '',
          },
          admin: {
            pin: process.env['ADMIN_PIN'] ?? '1234',
          },
          jwt: {
            secret: process.env['JWT_SECRET'] ?? 'sonos-jukebox-secret-key-change-in-prod',
          },
          sonos: {
            host: process.env['SONOS_HOST'] ?? 'localhost',
            port: parseInt(process.env['SONOS_PORT'] ?? '5005', 10),
          },
        }),
      ],
    }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    MediaModule,
    SonosModule,
    SpotifyModule,
    TuneInModule,
    AlarmsModule,
    SchedulesModule,
    AutoplayModule,
    SleepTimerModule,
    AppConfigModule,
    HealthModule,
    MigrationModule,
  ],
})
export class AppModule {}
