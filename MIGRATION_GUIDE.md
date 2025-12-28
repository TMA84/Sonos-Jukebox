# Migration Guide: v2.x to v3.0

This guide helps you migrate from the old JSON-file-based system to the new database-backed architecture.

## Breaking Changes

### 1. Backend Architecture
- **Old**: Plain JavaScript with JSON file storage
- **New**: TypeScript with SQLite/PostgreSQL database

### 2. API Changes
- All endpoints now use RESTful conventions
- Authentication now uses JWT tokens instead of simple PIN checks
- Response formats are standardized

### 3. Configuration
- **Old**: `server/config/config.json`
- **New**: Environment variables (`.env` file) + database config table

## Migration Steps

### Step 1: Backup Your Data

```bash
# Backup all configuration and data files
mkdir backup
cp -r server/config backup/
```

### Step 2: Install New Dependencies

```bash
npm install
```

### Step 3: Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Step 4: Run Migration Script

```bash
# This will migrate your old JSON data to the new database
npm run migrate:from-v2
```

The migration script will:
1. Read your old `config.json` and `data-*.json` files
2. Create the new SQLite database
3. Import all clients and media items
4. Preserve your PIN and Sonos configuration

### Step 5: Verify Migration

```bash
# Start the server
npm start

# Check health endpoint
curl http://localhost:8200/health

# Verify your data
curl http://localhost:8200/api/clients
```

### Step 6: Update Docker Setup (if using)

```bash
# Rebuild Docker image
docker-compose down
docker-compose build
docker-compose up -d
```

## API Endpoint Changes

### Authentication

**Old:**
```javascript
GET /api/pin
POST /api/config/pin
```

**New:**
```javascript
POST /api/auth/pin/verify
POST /api/auth/pin/change
```

### Media Items

**Old:**
```javascript
GET /api/data?clientId=xxx
POST /api/add
POST /api/delete
```

**New:**
```javascript
GET /api/media?clientId=xxx
POST /api/media
DELETE /api/media/:id
```

### Clients

**Old:**
```javascript
GET /api/clients
POST /api/clients/create
POST /api/clients/delete
```

**New:**
```javascript
GET /api/clients
POST /api/clients
DELETE /api/clients/:id
PUT /api/clients/:id
```

### Configuration

**Old:**
```javascript
GET /api/config/full
POST /api/config/spotify
POST /api/config/sonos
```

**New:**
```javascript
GET /api/config
POST /api/config/sonos
```

## Frontend Changes

### State Management

The app now uses NgRx for state management. If you have custom components:

**Old:**
```typescript
this.mediaService.getData(clientId).subscribe(data => {
  this.items = data;
});
```

**New:**
```typescript
this.store.dispatch(loadMedia({ clientId }));
this.items$ = this.store.select(selectAllMedia);
```

### Authentication

**Old:**
```typescript
this.configService.verifyPin(pin).subscribe(valid => {
  if (valid) this.router.navigate(['/config']);
});
```

**New:**
```typescript
this.store.dispatch(verifyPin({ pin, clientId }));
this.store.select(selectAuthToken).subscribe(token => {
  if (token) this.router.navigate(['/config']);
});
```

## Configuration File Format

### Old Format (config.json)

```json
{
  "node-sonos-http-api": {
    "server": "192.168.1.100",
    "port": "5005"
  },
  "spotify": {
    "clientId": "xxx",
    "clientSecret": "yyy"
  },
  "clients": {
    "client-abc": {
      "name": "Kids Room",
      "room": "Living Room"
    }
  }
}
```

### New Format (.env)

```bash
SONOS_API_HOST=192.168.1.100
SONOS_API_PORT=5005
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=yyy
JWT_SECRET=your-secret-key
```

Client data is now stored in the database, not in config files.

## Rollback Plan

If you need to rollback to v2.x:

```bash
# Stop the new version
docker-compose down

# Restore backup
cp -r backup/config/* server/config/

# Checkout old version
git checkout v2.1.8

# Rebuild and start
npm install
npm start
```

## Troubleshooting

### Database Connection Issues

```bash
# Check database file exists
ls -la server/data/database.sqlite

# Check permissions
chmod 644 server/data/database.sqlite
```

### Missing Data After Migration

```bash
# Re-run migration with verbose logging
LOG_LEVEL=debug npm run migrate:from-v2
```

### API Authentication Errors

```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Get new token
curl -X POST http://localhost:8200/api/auth/pin/verify \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","clientId":"default"}'
```

## Support

For issues during migration:
1. Check the logs: `tail -f server/logs/combined-*.log`
2. Open an issue on GitHub with your error logs
3. Join our Discord community for real-time help

## New Features in v3.0

After successful migration, you can use:

- **API Documentation**: Visit `http://localhost:8200/api-docs`
- **Health Monitoring**: `http://localhost:8200/health`
- **Better Performance**: Database queries are much faster than JSON files
- **Proper Authentication**: JWT tokens with expiration
- **Rate Limiting**: Protection against API abuse
- **Structured Logging**: Better debugging with Winston
- **Type Safety**: Full TypeScript on backend
