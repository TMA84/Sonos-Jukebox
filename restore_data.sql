-- Script to copy data from old database to new database
-- Run this with: sqlite3 new_database.sqlite < restore_data.sql

-- Attach the old database
ATTACH DATABASE 'old_database.sqlite' AS old_db;

-- Copy all data from old database tables
INSERT OR IGNORE INTO clients SELECT * FROM old_db.clients;
INSERT OR IGNORE INTO config SELECT * FROM old_db.config;
INSERT OR IGNORE INTO users SELECT * FROM old_db.users;

-- Copy media_items data (will work with both old and new schema)
INSERT OR IGNORE INTO media_items 
SELECT * FROM old_db.media_items;

-- Detach old database
DETACH DATABASE old_db;
