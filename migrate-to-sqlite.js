const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Create database directory
const dbDir = './server/data';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database('./server/data/database.sqlite');

// Create tables
db.serialize(() => {
    // Config table
    db.run(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Clients table
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        room TEXT,
        enableSpeakerSelection BOOLEAN DEFAULT 1,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Media items table
    db.run(`CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT,
        cover TEXT,
        spotifyUri TEXT,
        spotifyId TEXT,
        artistid TEXT,
        contentType TEXT,
        metadata TEXT,
        playCount INTEGER DEFAULT 0,
        lastPlayedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )`);

    // Users table (for PIN management)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Migration function
function migrateData() {
    console.log('Starting migration from JSON to SQLite...');

    // Migrate config
    if (fs.existsSync('./server/config/config.json')) {
        const config = JSON.parse(fs.readFileSync('./server/config/config.json', 'utf8'));
        
        // Migrate Sonos config
        if (config['node-sonos-http-api']) {
            const sonosConfig = config['node-sonos-http-api'];
            db.run('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                ['sonos_api_host', sonosConfig.server, 'Sonos HTTP API host']);
            db.run('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                ['sonos_api_port', sonosConfig.port, 'Sonos HTTP API port']);
            if (sonosConfig.rooms) {
                db.run('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                    ['sonos_rooms', JSON.stringify(sonosConfig.rooms), 'Available Sonos rooms']);
            }
        }

        // Migrate Spotify config
        if (config.spotify) {
            db.run('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                ['spotify_client_id', config.spotify.clientId, 'Spotify Client ID']);
            db.run('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                ['spotify_client_secret', config.spotify.clientSecret, 'Spotify Client Secret']);
        }

        // Migrate clients
        if (config.clients) {
            Object.entries(config.clients).forEach(([clientId, clientData]) => {
                db.run(`INSERT OR REPLACE INTO clients (id, name, room, enableSpeakerSelection) 
                        VALUES (?, ?, ?, ?)`, 
                    [clientId, clientData.name, clientData.room || '', 
                     clientData.enableSpeakerSelection !== false ? 1 : 0]);
            });
        }
    }

    // Migrate PIN data
    if (fs.existsSync('./server/config/pin.json')) {
        const pinData = JSON.parse(fs.readFileSync('./server/config/pin.json', 'utf8'));
        db.run('INSERT OR REPLACE INTO users (id, username, pin) VALUES (?, ?, ?)', 
            ['default', 'admin', pinData.pin || '1234']);
    } else if (fs.existsSync('./server/config/pin-default.json')) {
        const pinData = JSON.parse(fs.readFileSync('./server/config/pin-default.json', 'utf8'));
        db.run('INSERT OR REPLACE INTO users (id, username, pin) VALUES (?, ?, ?)', 
            ['default', 'admin', pinData.pin || '1234']);
    } else {
        db.run('INSERT OR REPLACE INTO users (id, username, pin) VALUES (?, ?, ?)', 
            ['default', 'admin', '1234']);
    }

    // Migrate client data files
    const configDir = './server/config';
    if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir);
        files.forEach(file => {
            if (file.startsWith('data-client-') && file.endsWith('.json')) {
                const clientId = file.replace('data-client-', '').replace('.json', '');
                const filePath = path.join(configDir, file);
                
                try {
                    const mediaData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    if (Array.isArray(mediaData)) {
                        mediaData.forEach(item => {
                            const id = require('crypto').randomUUID();
                            const title = item.title || item.album || `${item.artist} Content` || 'Untitled';
                            db.run(`INSERT OR REPLACE INTO media_items 
                                    (id, clientId, type, category, title, artist, cover, spotifyUri, spotifyId, artistid, contentType, metadata) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                                [id, clientId, item.type || 'spotify', item.category || 'music', 
                                 title, item.artist, item.cover, item.spotifyUri, item.spotifyId, 
                                 item.artistid, item.contentType, JSON.stringify(item)]);
                        });
                        console.log(`Migrated ${mediaData.length} items for client ${clientId}`);
                    }
                } catch (error) {
                    console.error(`Error migrating ${file}:`, error.message);
                }
            }
        });
    }

    console.log('Migration completed!');
    
    // Create backup of JSON files
    const backupDir = './server/config-backup';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('Created backup directory');
    }
    
    // Copy JSON files to backup
    if (fs.existsSync('./server/config')) {
        const files = fs.readdirSync('./server/config');
        files.forEach(file => {
            if (file.endsWith('.json')) {
                fs.copyFileSync(
                    path.join('./server/config', file),
                    path.join(backupDir, file)
                );
            }
        });
        console.log('JSON files backed up to server/config-backup/');
    }
}

// Run migration after tables are created
db.serialize(() => {
    console.log('Connected to SQLite database');
    
    // Wait for tables to be created, then migrate
    setTimeout(() => {
        migrateData();
        
        setTimeout(() => {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }, 1000);
    }, 500);
});
