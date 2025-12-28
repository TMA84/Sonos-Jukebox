import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1703000000000 implements MigrationInterface {
  name = 'InitialSchema1703000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" varchar PRIMARY KEY NOT NULL,
        "username" varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "isActive" boolean NOT NULL DEFAULT (1),
        "isAdmin" boolean NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create clients table
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "room" varchar,
        "enableSpeakerSelection" boolean NOT NULL DEFAULT (1),
        "isActive" boolean NOT NULL DEFAULT (1),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create media_items table
    await queryRunner.query(`
      CREATE TABLE "media_items" (
        "id" varchar PRIMARY KEY NOT NULL,
        "clientId" varchar NOT NULL,
        "type" varchar NOT NULL,
        "category" varchar NOT NULL,
        "title" varchar NOT NULL,
        "artist" varchar,
        "cover" varchar,
        "spotifyUri" varchar,
        "spotifyId" varchar,
        "metadata" text,
        "playCount" integer NOT NULL DEFAULT (0),
        "lastPlayedAt" datetime,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE
      )
    `);

    // Create config table
    await queryRunner.query(`
      CREATE TABLE "config" (
        "key" varchar PRIMARY KEY NOT NULL,
        "value" text NOT NULL,
        "description" varchar,
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_media_items_clientId" ON "media_items" ("clientId")`);
    await queryRunner.query(`CREATE INDEX "IDX_media_items_category" ON "media_items" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_media_items_type" ON "media_items" ("type")`);

    // Insert default config
    await queryRunner.query(`
      INSERT INTO "config" ("key", "value", "description") VALUES
      ('pin', '1234', 'Default PIN for configuration access'),
      ('sonos_api_host', '127.0.0.1', 'Sonos HTTP API host'),
      ('sonos_api_port', '5005', 'Sonos HTTP API port')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_media_items_type"`);
    await queryRunner.query(`DROP INDEX "IDX_media_items_category"`);
    await queryRunner.query(`DROP INDEX "IDX_media_items_clientId"`);
    await queryRunner.query(`DROP TABLE "config"`);
    await queryRunner.query(`DROP TABLE "media_items"`);
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
