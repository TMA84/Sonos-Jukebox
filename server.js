const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const SpotifyWebApi = require('spotify-web-api-node');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

// PIN encryption functions
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function verifyPin(inputPin, hashedPin) {
  return hashPin(inputPin) === hashedPin;
}
app.use(express.json());

// Create database directory
const dbDir = './server/data';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = process.env.DB_PATH || './server/data/database.sqlite';
console.log(`[Database] Using database path: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create config table
    await dbRun(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

    // Create users table for PIN authentication
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            pin TEXT NOT NULL,
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

    // Create clients table
    await dbRun(`CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            room TEXT,
            enableSpeakerSelection INTEGER DEFAULT 1,
            enableAlarmClock INTEGER DEFAULT 1,
            sleepTimer INTEGER DEFAULT 0,
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

    // Create media_items table
    await dbRun(`CREATE TABLE IF NOT EXISTS media_items (
            id TEXT NOT NULL,
            clientId TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            cover TEXT,
            type TEXT,
            category TEXT,
            contentType TEXT,
            spotifyUri TEXT,
            spotifyId TEXT,
            artistid TEXT,
            metadata TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, clientId),
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )`);

    // Create alarms table
    await dbRun(`CREATE TABLE IF NOT EXISTS alarms (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            name TEXT NOT NULL,
            time TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            days TEXT,
            mediaId TEXT,
            mediaTitle TEXT,
            volume INTEGER DEFAULT 30,
            fadeIn INTEGER DEFAULT 1,
            fadeDuration INTEGER DEFAULT 30,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )`);

    console.log('Database tables initialized successfully');

    // Migrate clients table to add missing columns
    await migrateClientsSchema();

    // Migrate media_items table to use composite primary key
    await migrateMediaItemsSchema();

    // Check for and migrate legacy JSON files
    await migrateLegacyData();

    // Clean up old Sonos config keys (must run AFTER legacy migration)
    await cleanupOldSonosConfigKeys();

    // Initialize configuration from environment variables (for Home Assistant addon)
    await initializeFromEnvironment();

    // Clean up old Sonos config keys again (in case env vars added them)
    await cleanupOldSonosConfigKeys();

    // Create default client if none exist
    await createDefaultClientIfNeeded();

    // Log final Sonos configuration for debugging
    const finalSonosConfig = await dbAll(
      'SELECT key, value FROM config WHERE key LIKE "%sonos%" ORDER BY key'
    );
    console.log('=== Final Sonos Configuration ===');
    finalSonosConfig.forEach(row => {
      console.log(`  ${row.key} = ${row.value}`);
    });
    console.log('=================================');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Migrate legacy JSON files to SQLite database
// Migrate clients table to add missing columns
async function migrateClientsSchema() {
  try {
    // Check if migration is needed by looking at table schema
    const tableInfo = await dbAll('PRAGMA table_info(clients)');
    const hasEnableSpeakerSelection = tableInfo.some(col => col.name === 'enableSpeakerSelection');
    const hasEnableAlarmClock = tableInfo.some(col => col.name === 'enableAlarmClock');
    const hasSleepTimer = tableInfo.some(col => col.name === 'sleepTimer');
    const hasUpdatedAt = tableInfo.some(col => col.name === 'updatedAt');

    if (!hasEnableSpeakerSelection) {
      console.log('Adding enableSpeakerSelection column to clients table...');
      await dbRun('ALTER TABLE clients ADD COLUMN enableSpeakerSelection INTEGER DEFAULT 1');
    }

    if (!hasEnableAlarmClock) {
      console.log('Adding enableAlarmClock column to clients table...');
      await dbRun('ALTER TABLE clients ADD COLUMN enableAlarmClock INTEGER DEFAULT 1');
    }

    if (!hasSleepTimer) {
      console.log('Adding sleepTimer column to clients table...');
      await dbRun('ALTER TABLE clients ADD COLUMN sleepTimer INTEGER DEFAULT 0');
    }

    if (!hasUpdatedAt) {
      console.log('Adding updatedAt column to clients table...');
      await dbRun('ALTER TABLE clients ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP');
    }

    console.log('Clients table migration completed successfully');
  } catch (error) {
    console.log('Clients table migration not needed or already completed');
  }
}

// Migrate media_items table to use composite primary key and add missing columns
async function migrateMediaItemsSchema() {
  try {
    // Check if migration is needed by looking at table schema
    const tableInfo = await dbAll('PRAGMA table_info(media_items)');
    const hasPrimaryKey = tableInfo.some(col => col.pk === 1 && col.name === 'id');
    const hasSpotifyUri = tableInfo.some(col => col.name === 'spotifyUri');
    const hasSpotifyId = tableInfo.some(col => col.name === 'spotifyId');
    const hasArtistId = tableInfo.some(col => col.name === 'artistid');
    const hasUpdatedAt = tableInfo.some(col => col.name === 'updatedAt');

    if (hasPrimaryKey || !hasSpotifyUri || !hasSpotifyId || !hasArtistId || !hasUpdatedAt) {
      console.log(
        'Migrating media_items table to composite primary key and adding missing columns...'
      );

      // Create new table with composite primary key and all columns
      await dbRun(`CREATE TABLE IF NOT EXISTS media_items_new (
                id TEXT NOT NULL,
                clientId TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                cover TEXT,
                type TEXT,
                category TEXT,
                contentType TEXT,
                spotifyUri TEXT,
                spotifyId TEXT,
                artistid TEXT,
                metadata TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, clientId),
                FOREIGN KEY (clientId) REFERENCES clients(id)
            )`);

      // Copy data from old table (only columns that exist)
      await dbRun(`INSERT OR IGNORE INTO media_items_new 
                        (id, clientId, title, artist, cover, type, category, contentType, metadata, createdAt)
                        SELECT id, clientId, title, artist, cover, type, category, contentType, metadata, createdAt
                        FROM media_items`);

      // Drop old table and rename new one
      await dbRun(`DROP TABLE media_items`);
      await dbRun(`ALTER TABLE media_items_new RENAME TO media_items`);

      console.log('Media items table migration completed successfully');
    }
  } catch (error) {
    console.log('Media items table migration not needed or already completed:', error.message);
  }
}

async function migrateLegacyData() {
  const fs = require('fs');
  const path = require('path');

  try {
    // Check for legacy config.json
    const configPath = path.join(__dirname, 'server', 'config', 'config.json');
    if (fs.existsSync(configPath)) {
      console.log('Found legacy config.json, migrating to database...');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Migrate Spotify config
      if (configData.spotify) {
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'spotify_client_id',
          configData.spotify.clientId || '',
        ]);
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'spotify_client_secret',
          configData.spotify.clientSecret || '',
        ]);
      }

      // Migrate Sonos config
      if (configData['node-sonos-http-api']) {
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'sonos_api_host',
          configData['node-sonos-http-api'].server || '',
        ]);
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'sonos_api_port',
          configData['node-sonos-http-api'].port || '5005',
        ]);
      }

      // Migrate clients
      if (configData.clients) {
        for (const [clientId, clientData] of Object.entries(configData.clients)) {
          await dbRun('INSERT OR REPLACE INTO clients (id, name, room) VALUES (?, ?, ?)', [
            clientId,
            clientData.name || clientId,
            clientData.room || '',
          ]);
        }
      }

      console.log('Config migration completed');
    }

    // Check for legacy PIN file
    const pinPath = path.join(__dirname, 'server', 'config', 'pin.json');
    if (fs.existsSync(pinPath)) {
      console.log('Found legacy pin.json, migrating to database...');
      const pinData = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
      if (pinData.pin) {
        // Check if PIN is already encrypted (64 chars = SHA256 hex)
        const pinToStore = pinData.pin.length === 64 ? pinData.pin : hashPin(pinData.pin);
        await dbRun('INSERT OR REPLACE INTO users (username, pin) VALUES (?, ?)', [
          'admin',
          pinToStore,
        ]);
      }
      console.log('PIN migration completed');
    } else {
      // Create default admin user with PIN 1234 if no admin exists
      const existingAdmin = await dbGet('SELECT username FROM users WHERE username = ?', ['admin']);
      if (!existingAdmin) {
        await dbRun('INSERT INTO users (username, pin) VALUES (?, ?)', ['admin', hashPin('1234')]);
        console.log('Created default admin user with PIN 1234');
      }
    }

    // Check for legacy client data files
    const configDir = path.join(__dirname, 'server', 'config');
    if (fs.existsSync(configDir)) {
      const files = fs.readdirSync(configDir);
      for (const file of files) {
        if (file.startsWith('data-client-') && file.endsWith('.json')) {
          const clientId = file.replace('data-client-', '').replace('.json', '');
          const dataPath = path.join(configDir, file);

          console.log(`Found legacy client data file: ${file}, migrating...`);
          const mediaData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

          if (Array.isArray(mediaData)) {
            for (const item of mediaData) {
              await dbRun(
                `INSERT OR REPLACE INTO media_items 
                                       (id, clientId, title, artist, cover, type, category, contentType, metadata) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  item.id || require('crypto').randomUUID(),
                  clientId,
                  item.title || '',
                  item.artist || '',
                  item.cover || '',
                  item.type || 'spotify',
                  item.category || 'music',
                  item.contentType || 'album',
                  JSON.stringify(item),
                ]
              );
            }
          }
          console.log(`Client data migration completed for ${clientId}`);
        }
      }
    }

    // Check for legacy data.json
    const dataPath = path.join(__dirname, 'server', 'config', 'data.json');
    if (fs.existsSync(dataPath)) {
      console.log('Found legacy data.json, migrating to database...');
      const mediaData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

      if (Array.isArray(mediaData)) {
        for (const item of mediaData) {
          await dbRun(
            `INSERT OR REPLACE INTO media_items 
                               (id, clientId, title, artist, cover, type, category, contentType, metadata) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id || require('crypto').randomUUID(),
              item.clientId || 'default',
              item.title || '',
              item.artist || '',
              item.cover || '',
              item.type || 'spotify',
              item.category || 'music',
              item.contentType || 'album',
              JSON.stringify(item),
            ]
          );
        }
      }
      console.log('Legacy data migration completed');
    }
  } catch (error) {
    console.error('Error during legacy data migration:', error);
  }
}

// Create default client if none exist
async function createDefaultClientIfNeeded() {
  try {
    const existingClients = await dbAll('SELECT id FROM clients WHERE isActive = 1');

    if (existingClients.length === 0) {
      const defaultClientId = 'client-default';
      const defaultClientName = 'Default Client';

      await dbRun(
        'INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)',
        [defaultClientId, defaultClientName, '', 1]
      );

      console.log(`Created default client: ${defaultClientId}`);
    }
  } catch (error) {
    console.error('Error creating default client:', error);
  }
}

// Clean up old Sonos configuration keys (migrate from sonos_server/sonos_port to sonos_api_host/sonos_api_port)
async function cleanupOldSonosConfigKeys() {
  try {
    // Check if old keys exist
    const oldHost = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_server']);
    const oldPort = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_port']);

    // If old keys exist, migrate them to new keys if new keys don't exist
    if (oldHost) {
      const newHost = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
      if (!newHost || !newHost.value) {
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'sonos_api_host',
          oldHost.value,
        ]);
        console.log(`Migrated sonos_server (${oldHost.value}) to sonos_api_host`);
      } else {
        console.log(
          `Keeping existing sonos_api_host (${newHost.value}), discarding old sonos_server (${oldHost.value})`
        );
      }
      // Always delete old key
      await dbRun('DELETE FROM config WHERE key = ?', ['sonos_server']);
      console.log('Deleted old sonos_server key');
    }

    if (oldPort) {
      const newPort = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);
      if (!newPort || !newPort.value) {
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'sonos_api_port',
          oldPort.value,
        ]);
        console.log(`Migrated sonos_port (${oldPort.value}) to sonos_api_port`);
      } else {
        console.log(
          `Keeping existing sonos_api_port (${newPort.value}), discarding old sonos_port (${oldPort.value})`
        );
      }
      // Always delete old key
      await dbRun('DELETE FROM config WHERE key = ?', ['sonos_port']);
      console.log('Deleted old sonos_port key');
    }

    console.log('Sonos config keys cleanup completed');
  } catch (error) {
    console.error('Error during Sonos config keys cleanup:', error);
  }
}

// Initialize configuration from environment variables (for Home Assistant addon)
async function initializeFromEnvironment() {
  try {
    // Set configuration from environment variables if they exist
    if (process.env.SPOTIFY_CLIENT_ID) {
      await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
        'spotify_client_id',
        process.env.SPOTIFY_CLIENT_ID,
      ]);
    }

    if (process.env.SPOTIFY_CLIENT_SECRET) {
      await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
        'spotify_client_secret',
        process.env.SPOTIFY_CLIENT_SECRET,
      ]);
    }

    if (process.env.SONOS_SERVER) {
      await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
        'sonos_api_host',
        process.env.SONOS_SERVER,
      ]);
    }

    if (process.env.SONOS_PORT) {
      await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
        'sonos_api_port',
        process.env.SONOS_PORT,
      ]);
    }

    if (process.env.DEFAULT_ROOM) {
      await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
        'default_room',
        process.env.DEFAULT_ROOM,
      ]);
    }

    // Initialize admin PIN from environment only if no admin exists
    const existingAdmin = await dbGet('SELECT username FROM users WHERE username = ?', ['admin']);
    if (!existingAdmin) {
      const defaultPin = process.env.ADMIN_PIN || '1234';
      await dbRun('INSERT INTO users (username, pin) VALUES (?, ?)', [
        'admin',
        hashPin(defaultPin),
      ]);
      console.log('Created default admin user with encrypted PIN from environment');
    } else if (process.env.ADMIN_PIN && process.env.ADMIN_PIN !== '1234') {
      // Only update if environment PIN is different from default (user customized it)
      const currentPin = await dbGet('SELECT pin FROM users WHERE username = ?', ['admin']);
      if (currentPin && verifyPin('1234', currentPin.pin)) {
        await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [
          hashPin(process.env.ADMIN_PIN),
          'admin',
        ]);
        console.log('Updated admin PIN from environment (was default)');
      }
    }

    console.log('Environment configuration initialized');
  } catch (error) {
    console.error('Error initializing from environment:', error);
  }
}

// Database helper functions
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Initialize Spotify API
let spotifyApi;

async function initializeSpotify() {
  try {
    const clientId = await dbGet('SELECT value FROM config WHERE key = ?', ['spotify_client_id']);
    const clientSecret = await dbGet('SELECT value FROM config WHERE key = ?', [
      'spotify_client_secret',
    ]);

    spotifyApi = new SpotifyWebApi({
      clientId: clientId?.value || '',
      clientSecret: clientSecret?.value || '',
    });

    if (clientId?.value && clientSecret?.value) {
      const data = await spotifyApi.clientCredentialsGrant();
      spotifyApi.setAccessToken(data.body['access_token']);
      console.log('Spotify API initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing Spotify API:', error.message);
  }
}

// Token refresh for Spotify
async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    return data.body['access_token'];
  } catch (error) {
    console.error('Error refreshing Spotify token:', error.message);
    throw error;
  }
}

// API Routes

// Get configuration
app.get('/api/config', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (clientId) {
      const client = await dbGet('SELECT * FROM clients WHERE id = ?', [clientId]);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } else {
      const configs = await dbAll('SELECT * FROM config');
      const configObj = {};
      configs.forEach(config => {
        configObj[config.key] = config.value;
      });
      res.json(configObj);
    }
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get full configuration in nested format for frontend
app.get('/api/config/full', async (req, res) => {
  try {
    const configRows = await dbAll('SELECT key, value FROM config');
    const configObj = {};

    configRows.forEach(row => {
      configObj[row.key] = row.value;
    });

    // Transform flat config to nested format expected by frontend
    const nestedConfig = {
      spotify: {
        clientId: configObj.spotify_client_id || '',
        clientSecret: configObj.spotify_client_secret || '',
      },
      amazonmusic: {
        accessKey: configObj.amazon_access_key || '',
        secretKey: configObj.amazon_secret_key || '',
      },
      applemusic: {
        developerToken: configObj.apple_developer_token || '',
        teamId: configObj.apple_team_id || '',
      },
      tunein: {
        apiKey: configObj.tunein_api_key || '',
        partnerId: configObj.tunein_partner_id || '',
      },
      'node-sonos-http-api': {
        server: configObj.sonos_api_host || '',
        port: configObj.sonos_api_port || '',
      },
    };

    res.json(nestedConfig);
  } catch (error) {
    console.error('Error getting full config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update configuration
app.post('/api/config', async (req, res) => {
  try {
    const { key, value } = req.body;
    await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await dbAll('SELECT * FROM clients WHERE isActive = 1');
    res.json(clients);
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    const { name, room, enableSpeakerSelection = true } = req.body;
    const id = `client-${Date.now()}`;

    await dbRun(
      'INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)',
      [id, name, room, enableSpeakerSelection ? 1 : 0]
    );

    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, room, enableSpeakerSelection } = req.body;

    await dbRun(
      'UPDATE clients SET name = ?, room = ?, enableSpeakerSelection = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [name, room, enableSpeakerSelection ? 1 : 0, id]
    );

    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
app.post('/api/clients/delete', async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    // Soft delete by setting isActive to 0
    await dbRun('UPDATE clients SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [
      clientId,
    ]);

    res.send('Client deleted successfully');
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create client (alternative endpoint for frontend compatibility)
app.post('/api/clients/create', async (req, res) => {
  try {
    const { clientId, name } = req.body;

    if (!clientId || !name) {
      return res.status(400).json({ error: 'Client ID and name required' });
    }

    await dbRun(
      'INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)',
      [clientId, name, '', 1]
    );

    res.send('Client created successfully');
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get media data for client
app.get('/api/data', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const mediaItems = await dbAll(
      'SELECT * FROM media_items WHERE clientId = ? ORDER BY createdAt DESC',
      [clientId]
    );
    res.json(mediaItems);
  } catch (error) {
    console.error('Error getting media data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add media item
app.post('/api/add', async (req, res) => {
  try {
    const {
      clientId,
      type,
      category,
      title,
      artist,
      cover,
      spotifyUri,
      spotifyId,
      artistid,
      contentType,
    } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ error: 'Client ID and title are required' });
    }

    const id = req.body.id || uuidv4(); // Use provided ID (for Spotify content) or generate UUID
    const metadata = JSON.stringify(req.body);

    await dbRun(
      `INSERT OR REPLACE INTO media_items 
                    (id, clientId, type, category, title, artist, cover, spotifyUri, spotifyId, artistid, contentType, metadata) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        clientId,
        type || 'spotify',
        category || 'music',
        title,
        artist,
        cover,
        spotifyUri,
        spotifyId,
        artistid,
        contentType,
        metadata,
      ]
    );

    const mediaItem = await dbGet('SELECT * FROM media_items WHERE id = ?', [id]);
    res.json(mediaItem);
  } catch (error) {
    console.error('Error adding media item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete media item by index (legacy endpoint for frontend compatibility)
app.post('/api/delete', async (req, res) => {
  try {
    const { index, clientId } = req.body;

    if (typeof index !== 'number' || !clientId) {
      return res.status(400).json({ error: 'Index and clientId are required' });
    }

    // Get all media items for this client ordered by creation date (same as /api/data)
    const mediaItems = await dbAll(
      'SELECT id FROM media_items WHERE clientId = ? ORDER BY createdAt DESC',
      [clientId]
    );

    if (index < 0 || index >= mediaItems.length) {
      return res.status(404).json({ error: 'Media item not found at index' });
    }

    // Delete the item at the specified index
    const itemToDelete = mediaItems[index];
    const result = await dbRun('DELETE FROM media_items WHERE id = ?', [itemToDelete.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Failed to delete media item' });
    }

    console.log(`Deleted media item at index ${index} for client ${clientId}`);
    res.json({ success: true, deletedId: itemToDelete.id });
  } catch (error) {
    console.error('Error deleting media item by index:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update media item by index
app.post('/api/update', async (req, res) => {
  try {
    const { index, item } = req.body;

    if (typeof index !== 'number' || !item || !item.clientId) {
      return res.status(400).json({ error: 'Index, item, and clientId are required' });
    }

    // Get all media items for this client ordered by creation date (same as /api/data)
    const mediaItems = await dbAll(
      'SELECT id FROM media_items WHERE clientId = ? ORDER BY createdAt DESC',
      [item.clientId]
    );

    if (index < 0 || index >= mediaItems.length) {
      return res.status(404).json({ error: 'Media item not found at index' });
    }

    // Update the item at the specified index
    const itemToUpdate = mediaItems[index];
    const result = await dbRun(
      'UPDATE media_items SET title = ?, artist = ?, type = ?, category = ?, contentType = ? WHERE id = ?',
      [item.title, item.artist, item.type, item.category, item.contentType, itemToUpdate.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Failed to update media item' });
    }

    console.log(`Updated media item at index ${index} for client ${item.clientId}`);
    res.json({ success: true, updatedId: itemToUpdate.id });
  } catch (error) {
    console.error('Error updating media item by index:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete media item
app.delete('/api/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM media_items WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting media item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ALARM ROUTES =====

// Get alarms for client
app.get('/api/alarms', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const alarms = await dbAll('SELECT * FROM alarms WHERE clientId = ? ORDER BY time ASC', [
      clientId,
    ]);

    // Parse days JSON string back to array
    const parsedAlarms = alarms.map(alarm => ({
      ...alarm,
      days: alarm.days ? JSON.parse(alarm.days) : [],
      enabled: Boolean(alarm.enabled),
      fadeIn: Boolean(alarm.fadeIn),
    }));

    res.json(parsedAlarms);
  } catch (error) {
    console.error('Error getting alarms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create alarm
app.post('/api/alarms', async (req, res) => {
  try {
    const {
      clientId,
      name,
      time,
      enabled,
      days,
      mediaId,
      mediaTitle,
      volume,
      fadeIn,
      fadeDuration,
    } = req.body;

    if (!clientId || !name || !time) {
      return res.status(400).json({ error: 'Client ID, name, and time are required' });
    }

    const id = uuidv4();
    const daysJson = JSON.stringify(days || []);

    await dbRun(
      `INSERT INTO alarms (id, clientId, name, time, enabled, days, mediaId, mediaTitle, volume, fadeIn, fadeDuration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        clientId,
        name,
        time,
        enabled ? 1 : 0,
        daysJson,
        mediaId,
        mediaTitle,
        volume || 30,
        fadeIn ? 1 : 0,
        fadeDuration || 30,
      ]
    );

    const alarm = await dbGet('SELECT * FROM alarms WHERE id = ?', [id]);
    const parsedAlarm = {
      ...alarm,
      days: alarm.days ? JSON.parse(alarm.days) : [],
      enabled: Boolean(alarm.enabled),
      fadeIn: Boolean(alarm.fadeIn),
    };

    res.json(parsedAlarm);
  } catch (error) {
    console.error('Error creating alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update alarm
app.put('/api/alarms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, time, enabled, days, mediaId, mediaTitle, volume, fadeIn, fadeDuration } =
      req.body;

    const daysJson = JSON.stringify(days || []);

    const result = await dbRun(
      `UPDATE alarms 
       SET name = ?, time = ?, enabled = ?, days = ?, mediaId = ?, mediaTitle = ?, volume = ?, fadeIn = ?, fadeDuration = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        time,
        enabled ? 1 : 0,
        daysJson,
        mediaId,
        mediaTitle,
        volume,
        fadeIn ? 1 : 0,
        fadeDuration,
        id,
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alarm not found' });
    }

    const alarm = await dbGet('SELECT * FROM alarms WHERE id = ?', [id]);
    const parsedAlarm = {
      ...alarm,
      days: alarm.days ? JSON.parse(alarm.days) : [],
      enabled: Boolean(alarm.enabled),
      fadeIn: Boolean(alarm.fadeIn),
    };

    res.json(parsedAlarm);
  } catch (error) {
    console.error('Error updating alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle alarm enabled/disabled
app.patch('/api/alarms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const result = await dbRun(
      'UPDATE alarms SET enabled = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [enabled ? 1 : 0, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alarm not found' });
    }

    const alarm = await dbGet('SELECT * FROM alarms WHERE id = ?', [id]);
    const parsedAlarm = {
      ...alarm,
      days: alarm.days ? JSON.parse(alarm.days) : [],
      enabled: Boolean(alarm.enabled),
      fadeIn: Boolean(alarm.fadeIn),
    };

    res.json(parsedAlarm);
  } catch (error) {
    console.error('Error toggling alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete alarm
app.delete('/api/alarms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM alarms WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alarm not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test alarm (manually trigger)
app.post('/api/alarms/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const alarm = await dbGet('SELECT * FROM alarms WHERE id = ?', [id]);

    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }

    console.log(`[Test Alarm] Manually triggering alarm: ${alarm.name}`);
    await triggerAlarm(alarm);

    res.json({ success: true, message: `Alarm "${alarm.name}" triggered successfully` });
  } catch (error) {
    console.error('Error testing alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop alarm (pause playback)
app.post('/api/alarms/stop', async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    // Get client's speaker
    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client || !client.room) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get Sonos API configuration from database
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);
    const sonosServer = hostConfig?.value || process.env.SONOS_SERVER || '172.30.0.50';
    const sonosPort = portConfig?.value || process.env.SONOS_PORT || '5005';
    const pauseUrl = `http://${sonosServer}:${sonosPort}/${encodeURIComponent(client.room)}/pause`;

    console.log(`[Alarm Stop] Stopping alarm for client ${clientId}, speaker: ${client.room}`);
    await fetch(pauseUrl);

    // Delete any snooze alarms for this client
    await dbRun('DELETE FROM alarms WHERE clientId = ? AND name LIKE ?', [clientId, '%Snooze%']);
    console.log(`[Alarm Stop] Deleted snooze alarms for client ${clientId}`);

    // Clear active alarm for this client
    activeAlarms.delete(clientId);

    res.json({ success: true, message: 'Alarm stopped' });
  } catch (error) {
    console.error('Error stopping alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Snooze alarm (reschedule for X minutes later)
app.post('/api/alarms/:id/snooze', async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;

    if (!minutes || minutes < 1) {
      return res.status(400).json({ error: 'Valid snooze duration required' });
    }

    const alarm = await dbGet('SELECT * FROM alarms WHERE id = ?', [id]);
    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }

    // Delete any existing snooze alarms for this client
    await dbRun('DELETE FROM alarms WHERE clientId = ? AND name LIKE ?', [
      alarm.clientId,
      '%Snooze%',
    ]);
    console.log(`[Alarm Snooze] Deleted previous snooze alarms for client ${alarm.clientId}`);

    // Calculate new time
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const snoozeTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Create a temporary one-time alarm for the snooze
    const snoozeAlarm = {
      id: uuidv4(),
      clientId: alarm.clientId,
      name: `${alarm.name} (Snooze)`,
      time: snoozeTime,
      enabled: 1,
      days: '[]', // One-time
      mediaId: alarm.mediaId,
      mediaTitle: alarm.mediaTitle,
      volume: alarm.volume,
      fadeIn: alarm.fadeIn,
      fadeDuration: alarm.fadeDuration,
    };

    await dbRun(
      `INSERT INTO alarms (id, clientId, name, time, enabled, days, mediaId, mediaTitle, volume, fadeIn, fadeDuration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snoozeAlarm.id,
        snoozeAlarm.clientId,
        snoozeAlarm.name,
        snoozeAlarm.time,
        snoozeAlarm.enabled,
        snoozeAlarm.days,
        snoozeAlarm.mediaId,
        snoozeAlarm.mediaTitle,
        snoozeAlarm.volume,
        snoozeAlarm.fadeIn,
        snoozeAlarm.fadeDuration,
      ]
    );

    // Pause current playback
    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [alarm.clientId]);
    if (client && client.room) {
      // Get Sonos API configuration from database
      const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
      const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);
      const sonosServer = hostConfig?.value || process.env.SONOS_SERVER || '172.30.0.50';
      const sonosPort = portConfig?.value || process.env.SONOS_PORT || '5005';
      const pauseUrl = `http://${sonosServer}:${sonosPort}/${encodeURIComponent(client.room)}/pause`;
      await fetch(pauseUrl);
    }

    console.log(
      `[Alarm Snooze] Alarm "${alarm.name}" snoozed for ${minutes} minutes until ${snoozeTime}`
    );
    res.json({ success: true, message: `Alarm snoozed for ${minutes} minutes`, snoozeTime });
  } catch (error) {
    console.error('Error snoozing alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active alarm for client
app.get('/api/alarms/active', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const activeAlarm = activeAlarms.get(clientId);
    if (activeAlarm) {
      res.json({ alarm: activeAlarm });
    } else {
      res.status(404).json({ error: 'No active alarm' });
    }
  } catch (error) {
    console.error('Error getting active alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Spotify token
app.get('/api/token', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const token = await refreshSpotifyToken();
    res.json({ access_token: token });
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    res.status(500).json({ error: 'Failed to get Spotify token' });
  }
});

// Spotify search endpoint
app.get('/api/search/spotify', async (req, res) => {
  const { query, type = 'album' } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const token = await refreshSpotifyToken();
    const searchType = type === 'show' ? 'show' : type === 'audiobook' ? 'audiobook' : 'album';

    const searchResults = await spotifyApi.search(query, [searchType], { limit: 20 });

    const results = {
      albums: [],
      shows: [],
      audiobooks: [],
    };

    if (searchType === 'album' && searchResults.body.albums) {
      results.albums = searchResults.body.albums.items.map(album => ({
        id: album.id,
        title: album.name,
        artist: album.artists[0]?.name || 'Unknown Artist',
        cover: album.images[0]?.url || '../assets/images/nocover.png',
      }));
    } else if (searchType === 'show' && searchResults.body.shows) {
      results.shows = searchResults.body.shows.items.map(show => ({
        id: show.id,
        title: show.name,
        artist: show.publisher || 'Unknown Publisher',
        cover: show.images[0]?.url || '../assets/images/nocover.png',
      }));
    } else if (searchType === 'audiobook' && searchResults.body.audiobooks) {
      results.audiobooks = searchResults.body.audiobooks.items.map(audiobook => ({
        id: audiobook.id,
        title: audiobook.name,
        artist: audiobook.authors?.map(author => author.name).join(', ') || 'Unknown Author',
        cover: audiobook.images[0]?.url || '../assets/images/nocover.png',
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Failed to search Spotify' });
  }
});

// PIN verification (for auth service)
app.post('/api/auth/pin/verify', async (req, res) => {
  try {
    const { pin, clientId } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);

    if (user && verifyPin(pin, user.pin)) {
      // Generate a simple token (in production, use proper JWT)
      const token = Buffer.from(`${Date.now()}-${clientId}`).toString('base64');
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid PIN' });
    }
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PIN change (for auth service)
app.post('/api/auth/pin/change', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);

    if (!user || !verifyPin(currentPin, user.pin)) {
      return res.status(401).json({ error: 'Invalid current PIN' });
    }

    await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [
      hashPin(newPin),
      'admin',
    ]);
    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Error changing PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy PIN endpoints (for backward compatibility)
app.get('/api/pin', async (req, res) => {
  try {
    const user = await dbGet('SELECT pin FROM users WHERE username = ? AND isActive = 1', [
      'admin',
    ]);
    res.send(user?.pin || '1234');
  } catch (error) {
    console.error('Error getting PIN:', error);
    res.status(500).send('Error getting PIN');
  }
});

app.post('/api/config/pin', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);

    if (!user || !verifyPin(currentPin, user.pin)) {
      return res.status(401).json({ error: 'Current PIN incorrect' });
    }

    await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [
      hashPin(newPin),
      'admin',
    ]);
    res.json({ success: true, message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Error updating PIN:', error);
    res.status(500).json({ error: 'Failed to save PIN' });
  }
});

// PIN verification
app.post('/api/pin/verify', async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);

    if (user && verifyPin(pin, user.pin)) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update PIN
app.post('/api/pin/update', async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);

    if (!user || !verifyPin(oldPin, user.pin)) {
      return res.status(400).json({ error: 'Invalid current PIN' });
    }

    await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [
      hashPin(newPin),
      'admin',
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client configuration endpoint
app.get('/api/config/client', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      id: client.id,
      name: client.name,
      room: client.room,
      sleepTimer: client.sleepTimer || 0,
      enableSpeakerSelection: !!client.enableSpeakerSelection,
      enableAlarmClock: client.enableAlarmClock !== 0,
    });
  } catch (error) {
    console.error('Error getting client config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/config/client', async (req, res) => {
  try {
    const { clientId, name, room, enableSpeakerSelection, enableAlarmClock } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    // Get current client data
    const currentClient = await dbGet('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!currentClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (room !== undefined) {
      updates.push('room = ?');
      values.push(room);
    }

    if (enableSpeakerSelection !== undefined) {
      updates.push('enableSpeakerSelection = ?');
      values.push(enableSpeakerSelection ? 1 : 0);
    }

    if (enableAlarmClock !== undefined) {
      updates.push('enableAlarmClock = ?');
      values.push(enableAlarmClock ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.json({ success: true }); // No updates needed
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(clientId);

    const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
    await dbRun(query, values);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating client config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Speaker configuration endpoint
app.post('/api/config/speaker', async (req, res) => {
  try {
    const { speaker, clientId } = req.body;

    // Update client's room/speaker setting
    await dbRun('UPDATE clients SET room = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [
      speaker,
      clientId,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating speaker config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sleep timer configuration endpoint
app.post('/api/config/sleepTimer', async (req, res) => {
  try {
    const { sleepTimer, clientId } = req.body;

    // Update client's sleep timer setting
    await dbRun('UPDATE clients SET sleepTimer = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [
      sleepTimer,
      clientId,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating sleep timer config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sonos configuration endpoint
app.post('/api/config/sonos', async (req, res) => {
  try {
    const { server, port } = req.body;

    // Update Sonos API configuration
    await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
      'sonos_api_host',
      server,
    ]);
    await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
      'sonos_api_port',
      port,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Sonos config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spotify configuration endpoint
app.post('/api/config/spotify', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;

    // Update both Spotify credentials
    await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
      'spotify_client_id',
      clientId,
    ]);
    await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
      'spotify_client_secret',
      clientSecret,
    ]);

    // Reinitialize Spotify API with new credentials
    await initializeSpotify();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Spotify config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spotify API routes
app.get('/api/spotify/status', (req, res) => {
  const configured = spotifyApi && spotifyApi.getClientId() && spotifyApi.getClientSecret();
  res.json({ configured: !!configured });
});

app.get('/api/spotify/search/albums', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    await refreshSpotifyToken();
    const result = await spotifyApi.searchAlbums(query, { limit, offset, market: 'DE' });
    res.json(result.body.albums);
  } catch (error) {
    console.error('Spotify search albums error:', error);
    res.status(500).json({ error: 'Failed to search albums' });
  }
});

app.get('/api/spotify/search/artists', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    await refreshSpotifyToken();
    const result = await spotifyApi.searchArtists(query, { limit, offset, market: 'DE' });
    res.json(result.body.artists);
  } catch (error) {
    console.error('Spotify search artists error:', error);
    res.status(500).json({ error: 'Failed to search artists' });
  }
});

app.get('/api/spotify/artists/:id/albums', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    await refreshSpotifyToken();
    const result = await spotifyApi.getArtistAlbums(req.params.id, {
      include_groups: 'album,single',
      limit,
      offset,
      market: 'DE',
    });
    res.json(result.body);
  } catch (error) {
    console.error('Spotify get artist albums error:', error);
    res.status(500).json({ error: 'Failed to get artist albums' });
  }
});

app.get('/api/spotify/albums/:id', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    await refreshSpotifyToken();
    const result = await spotifyApi.getAlbum(req.params.id, { market: 'DE' });
    res.json(result.body);
  } catch (error) {
    console.error('Spotify get album error:', error);
    res.status(500).json({ error: 'Failed to get album' });
  }
});

app.get('/api/spotify/shows/:id/episodes', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    await refreshSpotifyToken();
    const result = await spotifyApi.getShowEpisodes(req.params.id, {
      limit,
      offset,
      market: 'DE',
    });
    res.json(result.body);
  } catch (error) {
    console.error('Spotify get show episodes error:', error);
    res.status(500).json({ error: 'Failed to get show episodes' });
  }
});

app.get('/api/spotify/search/tracks', async (req, res) => {
  try {
    if (!spotifyApi) {
      await initializeSpotify();
    }

    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    await refreshSpotifyToken();
    const result = await spotifyApi.searchTracks(query, { limit, offset, market: 'DE' });
    res.json(result.body.tracks);
  } catch (error) {
    console.error('Spotify search tracks error:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// TuneIn Radio API endpoints
app.get('/api/tunein/search/stations', async (req, res) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // TuneIn search API call
    const searchUrl = `http://opml.radiotime.com/Search.ashx?query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl);
    const xmlData = await response.text();

    // Parse XML response
    const stations = [];
    const outlineMatches = xmlData.match(/<outline[^>]*type="audio"[^>]*>/g) || [];

    for (let i = 0; i < Math.min(outlineMatches.length, limit); i++) {
      const outline = outlineMatches[i];
      const textMatch = outline.match(/text="([^"]*)"/) || [];
      const urlMatch = outline.match(/URL="([^"]*)"/) || [];
      const imageMatch = outline.match(/image="([^"]*)"/) || [];
      const guideIdMatch = outline.match(/guide_id="([^"]*)"/) || [];
      const bitrateMatch = outline.match(/bitrate="([^"]*)"/) || [];
      const genreIdMatch = outline.match(/genre_id="([^"]*)"/) || [];

      if (textMatch[1] && urlMatch[1]) {
        // Use a default radio icon instead of potentially broken TuneIn images
        const defaultImage =
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNOC4yNSAxNi4yNWMtLjQxNC0uNDE0LS40MTQtMS4wODYgMC0xLjVhNS4yNSA1LjI1IDAgMCAxIDcuNSAwYy40MTQuNDE0LjQxNCAxLjA4NiAwIDEuNXMtMS4wODYuNDE0LTEuNSAwYTIuMjUgMi4yNSAwIDAgMC0zIDAgYy0uNDE0LjQxNC0xLjA4Ni40MTQtMS41IDB6IiBmaWxsPSIjMzM3M2RjIi8+CjxwYXRoIGQ9Ik02IDIwYy0uNTUyIDAtMS0uNDQ4LTEtMXMuNDQ4LTEgMS0xYzMuMzE0IDAgNi0yLjY4NiA2LTZzMi42ODYtNiA2LTZjLjU1MiAwIDEgLjQ0OCAxIDFzLS40NDggMS0xIDFjLTIuMjEgMC00IDEuNzktNCA0cy0xLjc5IDQtNCA0eiIgZmlsbD0iIzMzNzNkYyIvPgo8L3N2Zz4K';

        // Use the real TuneIn station image, fall back to guide_id-based logo URL, then default icon
        const stationImage =
          imageMatch[1] ||
          (guideIdMatch[1]
            ? `https://cdn-radiotime-logos.tunein.com/${guideIdMatch[1]}q.png`
            : '') ||
          defaultImage;

        // For TuneIn, use Sonos-compatible URI format
        const stationId = guideIdMatch[1] || `s${Date.now()}_${i}`;
        const sonosUri = `x-sonosapi-radio:${stationId}?sid=254&flags=8300&sn=1`;

        stations.push({
          id: stationId,
          name: textMatch[1],
          description: textMatch[1],
          image: stationImage,
          genre: genreIdMatch[1] || 'Unknown',
          bitrate: bitrateMatch[1] || '128',
          reliability: '99',
          streamUrl: sonosUri, // Use Sonos-compatible URI
        });
      }
    }

    res.json({ stations: { items: stations } });
  } catch (error) {
    console.error('TuneIn search error:', error);
    res.status(500).json({ error: 'TuneIn search failed' });
  }
});

// Fix existing radio station images - set real TuneIn logos based on station ID
app.post('/api/fix-radio-images', async (req, res) => {
  try {
    // Get all radio stations with placeholder or missing covers
    const stations = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, cover FROM media_items WHERE type = 'tunein' OR contentType = 'radio'`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    let updated = 0;
    for (const station of stations) {
      // If cover is a data: URI (SVG placeholder) or empty, replace with TuneIn logo
      if (!station.cover || station.cover.startsWith('data:')) {
        const logoUrl = `https://cdn-radiotime-logos.tunein.com/${station.id}q.png`;
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE media_items SET cover = ? WHERE id = ?',
            [logoUrl, station.id],
            function (err) {
              if (err) reject(err);
              else {
                updated += this.changes;
                resolve();
              }
            }
          );
        });
      }
    }

    res.json({ message: 'Fixed radio station images', updated });
  } catch (error) {
    console.error('Error fixing radio images:', error);
    res.status(500).json({ error: 'Failed to fix radio images' });
  }
});

// Clean up all radio stations (temporary fix)
app.post('/api/cleanup-radio', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM media WHERE category = ? AND type = ?',
        ['radio', 'tunein'],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    res.json({ message: 'Cleaned up all radio stations', success: true });
  } catch (error) {
    console.error('Error cleaning up radio stations:', error);
    res.status(500).json({ error: 'Failed to cleanup radio stations' });
  }
});

// Sonos player control endpoints
app.get('/api/sonos', async (req, res) => {
  try {
    const { clientId, room: requestedRoom } = req.query;

    // Use requested room if provided, otherwise get client's configured room
    let room = requestedRoom;
    if (!room) {
      const client = await dbGet('SELECT room FROM clients WHERE id = ?', [clientId]);
      room = client?.room || 'Living Room';
    }

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    // Get current state from Sonos API
    const response = await fetch(`http://${host}:${port}/${encodeURIComponent(room)}/state`);
    const state = await response.json();

    res.json(state);
  } catch (error) {
    console.error('Error getting Sonos state:', error);
    res.status(500).json({ error: 'Failed to get Sonos state' });
  }
});

app.post('/api/sonos/play', async (req, res) => {
  try {
    const { room, uri } = req.body;

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    // Play on Sonos - use different endpoints based on URI type
    let url;
    if (!uri) {
      // No URI - just play/resume
      url = `http://${host}:${port}/${encodeURIComponent(room)}/play`;
    } else if (uri.startsWith('x-sonosapi-radio:')) {
      // TuneIn radio station - extract station ID and use tunein/set endpoint then play
      const match = uri.match(/s(\d+)/);
      if (match) {
        const stationId = match[1];
        const setUrl = `http://${host}:${port}/${encodeURIComponent(room)}/tunein/set/${stationId}`;
        console.log('Setting TuneIn station:', { room, stationId, setUrl });
        await fetch(setUrl);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
        url = `http://${host}:${port}/${encodeURIComponent(room)}/play`;
      } else {
        throw new Error('Invalid TuneIn station ID format');
      }
    } else if (uri.startsWith('tunein:')) {
      // Direct TuneIn station ID - use tunein/set endpoint then play
      const stationId = uri.replace('tunein:', '');
      const setUrl = `http://${host}:${port}/${encodeURIComponent(room)}/tunein/set/${stationId}`;
      console.log('Setting TuneIn station:', { room, stationId, setUrl });
      await fetch(setUrl);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
      url = `http://${host}:${port}/${encodeURIComponent(room)}/play`;
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      // HTTP radio stream - use direct play endpoint
      url = `http://${host}:${port}/${encodeURIComponent(room)}/play/${uri}`;
    } else {
      // Spotify or other - use spotify endpoint
      url = `http://${host}:${port}/${encodeURIComponent(room)}/spotify/now/${uri}`;
    }

    console.log('Playing on Sonos:', { room, uri, url });
    const response = await fetch(url);
    const result = await response.json();

    console.log('Sonos response:', result);
    res.json(result);
  } catch (error) {
    console.error('Error playing on Sonos:', error);
    res.status(500).json({ error: 'Failed to play on Sonos' });
  }
});

app.post('/api/sonos/pause', async (req, res) => {
  try {
    const { room } = req.body;

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    const response = await fetch(`http://${host}:${port}/${encodeURIComponent(room)}/pause`);
    const result = await response.json();

    res.json(result);
  } catch (error) {
    console.error('Error pausing Sonos:', error);
    res.status(500).json({ error: 'Failed to pause Sonos' });
  }
});

app.post('/api/sonos/next', async (req, res) => {
  try {
    const { room } = req.body;

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    const response = await fetch(`http://${host}:${port}/${encodeURIComponent(room)}/next`);
    const result = await response.json();

    res.json(result);
  } catch (error) {
    console.error('Error skipping to next on Sonos:', error);
    res.status(500).json({ error: 'Failed to skip to next on Sonos' });
  }
});

app.post('/api/sonos/previous', async (req, res) => {
  try {
    const { room } = req.body;

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    const response = await fetch(`http://${host}:${port}/${encodeURIComponent(room)}/previous`);
    const result = await response.json();

    res.json(result);
  } catch (error) {
    console.error('Error skipping to previous on Sonos:', error);
    res.status(500).json({ error: 'Failed to skip to previous on Sonos' });
  }
});

app.post('/api/sonos/volume', async (req, res) => {
  try {
    const { room, change } = req.body;

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    const response = await fetch(
      `http://${host}:${port}/${encodeURIComponent(room)}/volume/${change}`
    );
    const result = await response.json();

    res.json(result);
  } catch (error) {
    console.error('Error changing volume on Sonos:', error);
    res.status(500).json({ error: 'Failed to change volume on Sonos' });
  }
});

app.post('/api/sonos/clearqueue', async (req, res) => {
  try {
    const { room } = req.body;

    // Get Sonos API configuration
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    const response = await fetch(`http://${host}:${port}/${encodeURIComponent(room)}/clearqueue`);
    const result = await response.json();

    res.json(result);
  } catch (error) {
    console.error('Error clearing queue on Sonos:', error);
    res.status(500).json({ error: 'Failed to clear queue on Sonos' });
  }
});

// Speakers endpoint using configured Sonos API
app.get('/api/speakers', async (req, res) => {
  try {
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    const host = hostConfig?.value || 'localhost';
    const port = portConfig?.value || '5005';

    const response = await fetch(`http://${host}:${port}/zones`);
    const zones = await response.json();

    res.json(zones);
  } catch (error) {
    console.error('Error fetching speakers:', error);
    res.status(500).json({ error: 'Failed to fetch speakers' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'www')));

// Catch all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// ===== ALARM SCHEDULER SERVICE =====

let alarmCheckInterval = null;
let lastCheckedMinute = null;
let activeAlarms = new Map(); // Track active alarms per client: clientId -> { alarm, triggeredAt }

async function checkAndTriggerAlarms() {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentMinute = `${currentDay}-${currentTime}`;

    // Prevent duplicate triggers within the same minute
    if (currentMinute === lastCheckedMinute) {
      return;
    }
    lastCheckedMinute = currentMinute;

    console.log(`[Alarm Check] Current time: ${currentTime}, Day: ${currentDay}`);

    // Get all enabled alarms
    const alarms = await dbAll('SELECT * FROM alarms WHERE enabled = 1');
    console.log(`[Alarm Check] Found ${alarms.length} enabled alarms`);

    if (alarms.length > 0) {
      alarms.forEach(alarm => {
        const days = alarm.days ? JSON.parse(alarm.days) : [];
        console.log(
          `  - ${alarm.name}: time=${alarm.time}, days=${JSON.stringify(days)}, enabled=${alarm.enabled}`
        );
      });
    }

    for (const alarm of alarms) {
      // Check if alarm time matches
      if (alarm.time !== currentTime) {
        continue;
      }

      console.log(`[Alarm Match] Time matches for alarm: ${alarm.name}`);

      // Parse days array
      const days = alarm.days ? JSON.parse(alarm.days) : [];

      // Check if alarm should trigger today
      let shouldTrigger = false;
      if (days.length === 0) {
        // One-time alarm - trigger once and disable
        shouldTrigger = true;
        await dbRun('UPDATE alarms SET enabled = 0 WHERE id = ?', [alarm.id]);
        console.log(`[Alarm Trigger] One-time alarm "${alarm.name}" triggered and disabled`);
      } else if (days.includes(currentDay)) {
        // Recurring alarm - check if today is included
        shouldTrigger = true;
        console.log(
          `[Alarm Trigger] Recurring alarm "${alarm.name}" triggered (day ${currentDay} is in schedule)`
        );
      } else {
        console.log(
          `[Alarm Skip] Alarm "${alarm.name}" not scheduled for today (day ${currentDay})`
        );
      }

      if (shouldTrigger) {
        console.log(
          `[Alarm Execute] Triggering alarm: ${alarm.name} at ${currentTime} for client ${alarm.clientId}`
        );
        await triggerAlarm(alarm);
      }
    }
  } catch (error) {
    console.error('[Alarm Error] Error checking alarms:', error);
  }
}

async function triggerAlarm(alarm) {
  try {
    console.log(`[Trigger Alarm] Starting alarm: ${alarm.name}`);

    // Get client configuration
    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [alarm.clientId]);
    if (!client || !client.room) {
      console.error(`[Trigger Alarm] No speaker configured for client ${alarm.clientId}`);
      return;
    }

    const speaker = client.room;
    console.log(`[Trigger Alarm] Speaker: ${speaker}`);

    // Get media item to play
    if (!alarm.mediaId) {
      console.error(`[Trigger Alarm] No media configured for alarm ${alarm.name}`);
      return;
    }

    console.log(`[Trigger Alarm] Looking for media with ID: ${alarm.mediaId}`);
    const mediaItem = await dbGet(
      'SELECT * FROM media_items WHERE (id = ? OR title = ?) AND clientId = ?',
      [alarm.mediaId, alarm.mediaId, alarm.clientId]
    );

    if (!mediaItem) {
      console.error(
        `[Trigger Alarm] Media item not found for alarm ${alarm.name}, mediaId: ${alarm.mediaId}`
      );
      return;
    }

    console.log(
      `[Trigger Alarm] Found media: ${mediaItem.title} by ${mediaItem.artist}, type: ${mediaItem.type}`
    );

    // Parse metadata if it exists
    let metadata = {};
    if (mediaItem.metadata) {
      try {
        metadata = JSON.parse(mediaItem.metadata);
        console.log(`[Trigger Alarm] Parsed metadata:`, JSON.stringify(metadata));
      } catch (e) {
        console.log('[Trigger Alarm] Could not parse metadata:', e.message);
      }
    }

    // Prepare volume settings
    const targetVolume = alarm.volume || 30;
    const startVolume = alarm.fadeIn ? 5 : targetVolume; // Start at 5% if fade-in is enabled

    // Get Sonos API configuration from database
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    console.log(
      `[Trigger Alarm] Database query results - hostConfig:`,
      hostConfig,
      'portConfig:',
      portConfig
    );

    const sonosServer = hostConfig?.value || process.env.SONOS_SERVER || '172.30.0.50';
    const sonosPort = portConfig?.value || process.env.SONOS_PORT || '5005';
    const sonosBaseUrl = `http://${sonosServer}:${sonosPort}`;

    console.log(`[Trigger Alarm] Using Sonos server: ${sonosBaseUrl}`);

    // Set initial volume BEFORE playing
    try {
      const volumeUrl = `${sonosBaseUrl}/${encodeURIComponent(speaker)}/volume/${startVolume}`;
      console.log(`[Trigger Alarm] Setting initial volume: ${volumeUrl}`);
      const volumeResponse = await fetch(volumeUrl);
      console.log(
        `[Trigger Alarm] Volume set to ${startVolume}%, status: ${volumeResponse.status}`
      );
    } catch (error) {
      console.error('[Trigger Alarm] Error setting volume:', error.message);
    }

    // Play media based on type
    let playUrl = '';
    const artistid = mediaItem.artistid || metadata.artistid;
    const spotifyId = mediaItem.spotifyId || metadata.spotifyId || mediaItem.id;
    const contentType = mediaItem.contentType || metadata.contentType;

    console.log(
      `[Trigger Alarm] Media details - artistid: ${artistid}, spotifyId: ${spotifyId}, contentType: ${contentType}`
    );

    if (mediaItem.type === 'spotify') {
      if (artistid && contentType === 'artist') {
        // For artists, fetch their albums and play the first one
        console.log(`[Trigger Alarm] Fetching albums for artist: ${artistid}`);
        try {
          const albumsResponse = await fetch(
            `http://localhost:8200/api/spotify/artists/${artistid}/albums?limit=1`
          );
          const albumsData = await albumsResponse.json();

          if (albumsData.items && albumsData.items.length > 0) {
            const firstAlbum = albumsData.items[0];
            playUrl = `${sonosBaseUrl}/${encodeURIComponent(speaker)}/spotify/now/spotify:album:${firstAlbum.id}`;
            console.log(
              `[Trigger Alarm] Playing first album: ${firstAlbum.name} (${firstAlbum.id})`
            );
          } else {
            console.error(`[Trigger Alarm] No albums found for artist ${artistid}`);
            return;
          }
        } catch (error) {
          console.error(`[Trigger Alarm] Error fetching artist albums:`, error.message);
          return;
        }
      } else if (spotifyId) {
        // Play specific album/playlist
        const uriType =
          contentType === 'show' ? 'show' : contentType === 'audiobook' ? 'audiobook' : 'album';
        playUrl = `${sonosBaseUrl}/${encodeURIComponent(speaker)}/spotify/now/spotify:${uriType}:${spotifyId}`;
        console.log(`[Trigger Alarm] Playing ${uriType}: ${spotifyId}`);
      }
    } else if (mediaItem.type === 'tunein') {
      // Play TuneIn radio station - use set endpoint then play
      const stationId = metadata.id || mediaItem.id;
      const cleanId = stationId.startsWith('s') ? stationId.substring(1) : stationId;
      const setUrl = `${sonosBaseUrl}/${encodeURIComponent(speaker)}/tunein/set/${cleanId}`;
      console.log(`[Trigger Alarm] Setting TuneIn station: ${setUrl}`);
      try {
        await fetch(setUrl);
        await new Promise(resolve => setTimeout(resolve, 500));
        playUrl = `${sonosBaseUrl}/${encodeURIComponent(speaker)}/play`;
        console.log(`[Trigger Alarm] Playing TuneIn station: ${cleanId}`);
      } catch (error) {
        console.error('[Trigger Alarm] Error setting TuneIn station:', error.message);
      }
    } else if (mediaItem.type === 'library') {
      // Play from music library
      playUrl = `${sonosBaseUrl}/${encodeURIComponent(speaker)}/musicsearch/${encodeURIComponent(mediaItem.artist)}/${encodeURIComponent(mediaItem.title)}`;
      console.log(`[Trigger Alarm] Playing from library: ${mediaItem.artist} - ${mediaItem.title}`);
    }

    if (playUrl) {
      console.log(`[Trigger Alarm] Playing alarm content: ${playUrl}`);
      try {
        const playResponse = await fetch(playUrl);
        const playResult = await playResponse.text();
        console.log(`[Trigger Alarm] Play response status: ${playResponse.status}`);
        console.log(`[Trigger Alarm] Play response body: ${playResult}`);

        if (!playResponse.ok) {
          console.error(
            `[Trigger Alarm] Failed to play content: ${playResponse.status} - ${playResult}`
          );
          return;
        }

        // Mark alarm as active for this client
        activeAlarms.set(alarm.clientId, {
          id: alarm.id,
          name: alarm.name,
          time: alarm.time,
          mediaTitle: alarm.mediaTitle,
          triggeredAt: new Date().toISOString(),
        });
        console.log(`[Trigger Alarm] Alarm marked as active for client ${alarm.clientId}`);

        // Wait a moment for playback to start before fade-in
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Handle fade-in if enabled
        if (alarm.fadeIn && alarm.fadeDuration) {
          await handleFadeIn(speaker, targetVolume, alarm.fadeDuration, sonosBaseUrl);
        }
      } catch (error) {
        console.error(`[Trigger Alarm] Error playing content:`, error.message);
      }
    } else {
      console.error(`[Trigger Alarm] Could not determine play URL for alarm ${alarm.name}`);
    }
  } catch (error) {
    console.error(`Error triggering alarm ${alarm.name}:`, error);
  }
}

async function handleFadeIn(speaker, targetVolume, duration, sonosBaseUrl) {
  try {
    // Volume is already at 5% from before playback started
    const startVolume = 5;

    // Calculate steps
    const steps = 10;
    const volumeStep = (targetVolume - startVolume) / steps;
    const timeStep = (duration * 1000) / steps;

    // Gradually increase volume
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, timeStep));
      const newVolume = Math.round(startVolume + volumeStep * i);
      await fetch(`${sonosBaseUrl}/${encodeURIComponent(speaker)}/volume/${newVolume}`);
      console.log(`[Fade-in] Volume ${newVolume}%`);
    }
  } catch (error) {
    console.error('[Fade-in] Error during fade-in:', error);
  }
}

function startAlarmScheduler() {
  console.log('Starting alarm scheduler...');

  // Check alarms every 30 seconds
  alarmCheckInterval = setInterval(checkAndTriggerAlarms, 30000);

  // Also check immediately on startup
  checkAndTriggerAlarms();
}

function stopAlarmScheduler() {
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
    alarmCheckInterval = null;
    console.log('Alarm scheduler stopped');
  }
}

// Initialize and start server
async function startServer() {
  try {
    await initializeDatabase();
    await initializeSpotify();
    startAlarmScheduler(); // Start alarm scheduler

    const port = process.env.PORT || 8200;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Open http://localhost:${port} in your browser`);
      console.log('Alarm scheduler is active');
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  stopAlarmScheduler(); // Stop alarm scheduler
  db.close(err => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

// Debug endpoint to check Sonos configuration
app.get('/api/debug/sonos-config', async (req, res) => {
  try {
    const allSonosConfig = await dbAll(
      'SELECT key, value FROM config WHERE key LIKE "%sonos%" ORDER BY key'
    );
    const hostConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const portConfig = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);

    res.json({
      allConfig: allSonosConfig,
      hostConfig: hostConfig,
      portConfig: portConfig,
      resolvedHost: hostConfig?.value || process.env.SONOS_SERVER || '172.30.0.50',
      resolvedPort: portConfig?.value || process.env.SONOS_PORT || '5005',
      envVars: {
        SONOS_SERVER: process.env.SONOS_SERVER || 'not set',
        SONOS_PORT: process.env.SONOS_PORT || 'not set',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

startServer();
