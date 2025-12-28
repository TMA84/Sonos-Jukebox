# SQLite Migration Guide

The Sonos Kids Controller has been successfully migrated from JSON file storage to SQLite database for better performance, data integrity, and scalability.

## What Changed

### Before (JSON Storage)
- Configuration stored in `server/config/config.json`
- Client data stored in separate files like `server/config/data-client-xyz.json`
- PIN stored in `server/config/pin.json`
- No data relationships or constraints
- Manual file management

### After (SQLite Storage)
- All data stored in `server/data/database.sqlite`
- Proper database schema with relationships
- Data integrity constraints
- Better performance for large datasets
- Atomic transactions

## Database Schema

### Tables Created

1. **config** - Application configuration
   - `key` (TEXT PRIMARY KEY)
   - `value` (TEXT NOT NULL)
   - `description` (TEXT)
   - `createdAt`, `updatedAt` (DATETIME)

2. **clients** - User profiles/clients
   - `id` (TEXT PRIMARY KEY)
   - `name` (TEXT NOT NULL)
   - `room` (TEXT)
   - `enableSpeakerSelection` (BOOLEAN)
   - `isActive` (BOOLEAN)
   - `createdAt`, `updatedAt` (DATETIME)

3. **media_items** - Music/audiobook content
   - `id` (TEXT PRIMARY KEY)
   - `clientId` (TEXT, FOREIGN KEY)
   - `type`, `category`, `title`, `artist` (TEXT)
   - `cover`, `spotifyUri`, `spotifyId`, `artistid` (TEXT)
   - `contentType`, `metadata` (TEXT)
   - `playCount` (INTEGER)
   - `lastPlayedAt`, `createdAt`, `updatedAt` (DATETIME)

4. **users** - PIN management
   - `id` (TEXT PRIMARY KEY)
   - `username` (TEXT UNIQUE)
   - `pin` (TEXT NOT NULL)
   - `isActive` (BOOLEAN)
   - `createdAt`, `updatedAt` (DATETIME)

## Migration Process

### Automatic Migration
The migration script (`migrate-to-sqlite.js`) automatically:

1. **Creates SQLite database** with proper schema
2. **Migrates configuration** from `config.json`
3. **Migrates clients** from the clients section
4. **Migrates media items** from all `data-client-*.json` files
5. **Migrates PIN** from `pin.json` or `pin-default.json`
6. **Creates backup** of all JSON files in `server/config-backup/`

### Running Migration
```bash
# Run migration (already completed)
npm run migrate

# Verify migration
node verify-migration.js
```

## New Server Features

### Enhanced API Endpoints
- `GET /api/config` - Get configuration (with optional clientId)
- `POST /api/config` - Update configuration
- `GET /api/clients` - Get all active clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `GET /api/data?clientId=xxx` - Get media items for client
- `POST /api/add` - Add new media item
- `DELETE /api/media/:id` - Delete media item
- `GET /api/token` - Get Spotify token
- `POST /api/pin/verify` - Verify PIN
- `POST /api/pin/update` - Update PIN

### Improved Performance
- **Faster queries** with proper indexing
- **Concurrent access** support
- **Data integrity** with foreign key constraints
- **Atomic operations** prevent data corruption

### Better Error Handling
- Proper HTTP status codes
- Detailed error messages
- Graceful database connection handling

## Usage

### Starting the Application
```bash
# Start with SQLite (new default)
npm start

# Start with old JSON system (backup)
npm run start-old
```

### Database Management
```bash
# View database contents
sqlite3 ./server/data/database.sqlite

# Example queries
sqlite3 ./server/data/database.sqlite "SELECT * FROM clients;"
sqlite3 ./server/data/database.sqlite "SELECT COUNT(*) FROM media_items;"
```

### Backup and Recovery
```bash
# Backup database
cp ./server/data/database.sqlite ./server/data/database-backup.sqlite

# Restore from backup
cp ./server/data/database-backup.sqlite ./server/data/database.sqlite
```

## Migration Results

✅ **Successfully migrated:**
- 5 configuration entries (Sonos API, Spotify credentials)
- 7 client profiles
- 25 media items across clients
- 1 admin user with PIN

✅ **Backup created:**
- All original JSON files backed up to `server/config-backup/`

✅ **Server running:**
- SQLite server running on port 8200
- All API endpoints functional
- Spotify integration working

## Benefits

1. **Performance**: Faster queries and better scalability
2. **Data Integrity**: Foreign key constraints prevent orphaned data
3. **Concurrency**: Multiple users can access simultaneously
4. **Backup**: Easy database backup and restore
5. **Maintenance**: Single database file vs multiple JSON files
6. **Features**: Support for play counts, last played tracking, etc.

## Rollback (if needed)

If you need to rollback to JSON storage:
```bash
# Use the old server
npm run start-old

# Restore JSON files from backup
cp -r ./server/config-backup/* ./server/config/
```

The original JSON files are preserved in `server/config-backup/` for safety.
