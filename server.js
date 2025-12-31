const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const SpotifyWebApi = require('spotify-web-api-node');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Create database directory
const dbDir = './server/data';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database('./server/data/database.sqlite');

// Initialize database tables
async function initializeDatabase() {
    try {
        // Create config table
        await dbRun(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Create clients table
        await dbRun(`CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            room TEXT,
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create media_items table
        await dbRun(`CREATE TABLE IF NOT EXISTS media_items (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            cover TEXT,
            type TEXT,
            category TEXT,
            contentType TEXT,
            metadata TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )`);

        console.log('Database tables initialized successfully');
        
        // Check for and migrate legacy JSON files
        await migrateLegacyData();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Migrate legacy JSON files to SQLite database
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
                await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 
                           ['spotify_client_id', configData.spotify.clientId || '']);
                await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 
                           ['spotify_client_secret', configData.spotify.clientSecret || '']);
            }
            
            // Migrate Sonos config
            if (configData['node-sonos-http-api']) {
                await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 
                           ['sonos_server', configData['node-sonos-http-api'].server || '']);
                await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 
                           ['sonos_port', configData['node-sonos-http-api'].port || '5005']);
            }
            
            // Migrate clients
            if (configData.clients) {
                for (const [clientId, clientData] of Object.entries(configData.clients)) {
                    await dbRun('INSERT OR REPLACE INTO clients (id, name, room) VALUES (?, ?, ?)', 
                               [clientId, clientData.name || clientId, clientData.room || '']);
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
                await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 
                           ['admin_pin', pinData.pin]);
            }
            console.log('PIN migration completed');
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
                            await dbRun(`INSERT OR REPLACE INTO media_items 
                                       (id, clientId, title, artist, cover, type, category, contentType, metadata) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                                item.id || require('crypto').randomUUID(),
                                clientId,
                                item.title || '',
                                item.artist || '',
                                item.cover || '',
                                item.type || 'spotify',
                                item.category || 'music',
                                item.contentType || 'album',
                                JSON.stringify(item)
                            ]);
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
                    await dbRun(`INSERT OR REPLACE INTO media_items 
                               (id, clientId, title, artist, cover, type, category, contentType, metadata) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        item.id || require('crypto').randomUUID(),
                        item.clientId || 'default',
                        item.title || '',
                        item.artist || '',
                        item.cover || '',
                        item.type || 'spotify',
                        item.category || 'music',
                        item.contentType || 'album',
                        JSON.stringify(item)
                    ]);
                }
            }
            console.log('Legacy data migration completed');
        }
        
    } catch (error) {
        console.error('Error during legacy data migration:', error);
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
        db.run(sql, params, function(err) {
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
        const clientSecret = await dbGet('SELECT value FROM config WHERE key = ?', ['spotify_client_secret']);
        
        spotifyApi = new SpotifyWebApi({
            clientId: clientId?.value || '',
            clientSecret: clientSecret?.value || ''
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
                clientSecret: configObj.spotify_client_secret || ''
            },
            amazonmusic: {
                accessKey: configObj.amazon_access_key || '',
                secretKey: configObj.amazon_secret_key || ''
            },
            applemusic: {
                developerToken: configObj.apple_developer_token || '',
                teamId: configObj.apple_team_id || ''
            },
            tunein: {
                apiKey: configObj.tunein_api_key || '',
                partnerId: configObj.tunein_partner_id || ''
            },
            'node-sonos-http-api': {
                server: configObj.sonos_api_host || '',
                port: configObj.sonos_api_port || ''
            }
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
        const { key, value, description } = req.body;
        await dbRun('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                   [key, value, description]);
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
        
        await dbRun('INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)', 
                   [id, name, room, enableSpeakerSelection ? 1 : 0]);
        
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
        
        await dbRun('UPDATE clients SET name = ?, room = ?, enableSpeakerSelection = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', 
                   [name, room, enableSpeakerSelection ? 1 : 0, id]);
        
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
        await dbRun('UPDATE clients SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [clientId]);
        
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
        
        await dbRun('INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)', 
                   [clientId, name, '', 1]);
        
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
        
        const mediaItems = await dbAll('SELECT * FROM media_items WHERE clientId = ? ORDER BY createdAt DESC', [clientId]);
        res.json(mediaItems);
    } catch (error) {
        console.error('Error getting media data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add media item
app.post('/api/add', async (req, res) => {
    try {
        const { clientId, type, category, title, artist, cover, spotifyUri, spotifyId, artistid, contentType } = req.body;
        
        if (!clientId || !title) {
            return res.status(400).json({ error: 'Client ID and title are required' });
        }
        
        const id = req.body.id || uuidv4(); // Use provided ID (for Spotify content) or generate UUID
        const metadata = JSON.stringify(req.body);
        
        await dbRun(`INSERT INTO media_items 
                    (id, clientId, type, category, title, artist, cover, spotifyUri, spotifyId, artistid, contentType, metadata) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                   [id, clientId, type || 'spotify', category || 'music', title, artist, cover, 
                    spotifyUri, spotifyId, artistid, contentType, metadata]);
        
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
            audiobooks: []
        };

        if (searchType === 'album' && searchResults.body.albums) {
            results.albums = searchResults.body.albums.items.map(album => ({
                id: album.id,
                title: album.name,
                artist: album.artists[0]?.name || 'Unknown Artist',
                cover: album.images[0]?.url || '../assets/images/nocover.png'
            }));
        } else if (searchType === 'show' && searchResults.body.shows) {
            results.shows = searchResults.body.shows.items.map(show => ({
                id: show.id,
                title: show.name,
                artist: show.publisher || 'Unknown Publisher',
                cover: show.images[0]?.url || '../assets/images/nocover.png'
            }));
        } else if (searchType === 'audiobook' && searchResults.body.audiobooks) {
            results.audiobooks = searchResults.body.audiobooks.items.map(audiobook => ({
                id: audiobook.id,
                title: audiobook.name,
                artist: audiobook.authors?.map(author => author.name).join(', ') || 'Unknown Author',
                cover: audiobook.images[0]?.url || '../assets/images/nocover.png'
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
        
        if (user && user.pin === pin) {
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
        
        if (!user || user.pin !== currentPin) {
            return res.status(401).json({ error: 'Invalid current PIN' });
        }
        
        await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [newPin, 'admin']);
        res.json({ message: 'PIN changed successfully' });
    } catch (error) {
        console.error('Error changing PIN:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Legacy PIN endpoints (for backward compatibility)
app.get('/api/pin', async (req, res) => {
    try {
        const user = await dbGet('SELECT pin FROM users WHERE username = ? AND isActive = 1', ['admin']);
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
        
        if (!user || user.pin !== currentPin) {
            return res.status(401).send('Current PIN incorrect');
        }
        
        await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [newPin, 'admin']);
        res.send('PIN changed successfully');
    } catch (error) {
        console.error('Error updating PIN:', error);
        res.status(500).send('Failed to save PIN');
    }
});

// PIN verification
app.post('/api/pin/verify', async (req, res) => {
    try {
        const { pin } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);
        
        if (user && user.pin === pin) {
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
        
        if (!user || user.pin !== oldPin) {
            return res.status(400).json({ error: 'Invalid current PIN' });
        }
        
        await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [newPin, 'admin']);
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
            enableSpeakerSelection: !!client.enableSpeakerSelection
        });
    } catch (error) {
        console.error('Error getting client config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/config/client', async (req, res) => {
    try {
        const { clientId, name, room, enableSpeakerSelection } = req.body;
        
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
        await dbRun('UPDATE clients SET room = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', 
                   [speaker, clientId]);
        
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
        await dbRun('UPDATE clients SET sleepTimer = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', 
                   [sleepTimer, clientId]);
        
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
        await dbRun('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                   ['sonos_api_host', server, 'Sonos API Host']);
        await dbRun('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                   ['sonos_api_port', port, 'Sonos API Port']);
        
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
        await dbRun('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                   ['spotify_client_id', clientId, 'Spotify Client ID']);
        await dbRun('INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)', 
                   ['spotify_client_secret', clientSecret, 'Spotify Client Secret']);
        
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
            market: 'DE' 
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
                const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNOC4yNSAxNi4yNWMtLjQxNC0uNDE0LS40MTQtMS4wODYgMC0xLjVhNS4yNSA1LjI1IDAgMCAxIDcuNSAwYy40MTQuNDE0LjQxNCAxLjA4NiAwIDEuNXMtMS4wODYuNDE0LTEuNSAwYTIuMjUgMi4yNSAwIDAgMC0zIDAgYy0uNDE0LjQxNC0xLjA4Ni40MTQtMS41IDB6IiBmaWxsPSIjMzM3M2RjIi8+CjxwYXRoIGQ9Ik02IDIwYy0uNTUyIDAtMS0uNDQ4LTEtMXMuNDQ4LTEgMS0xYzMuMzE0IDAgNi0yLjY4NiA2LTZzMi42ODYtNiA2LTZjLjU1MiAwIDEgLjQ0OCAxIDFzLS40NDggMS0xIDFjLTIuMjEgMC00IDEuNzktNCA0cy0xLjc5IDQtNCA0eiIgZmlsbD0iIzMzNzNkYyIvPgo8L3N2Zz4K';
                
                // For TuneIn, use Sonos-compatible URI format
                const stationId = guideIdMatch[1] || `s${Date.now()}_${i}`;
                const sonosUri = `x-sonosapi-radio:${stationId}?sid=254&flags=8300&sn=1`;
                
                stations.push({
                    id: stationId,
                    name: textMatch[1],
                    description: textMatch[1],
                    image: defaultImage, // Use default radio icon instead of TuneIn images
                    genre: genreIdMatch[1] || 'Unknown',
                    bitrate: bitrateMatch[1] || '128',
                    reliability: '99',
                    streamUrl: sonosUri // Use Sonos-compatible URI
                });
            }
        }
        
        res.json({ stations: { items: stations } });
    } catch (error) {
        console.error('TuneIn search error:', error);
        res.status(500).json({ error: 'TuneIn search failed' });
    }
});

// Fix existing radio station images
app.post('/api/fix-radio-images', async (req, res) => {
    try {
        const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNOC4yNSAxNi4yNWMtLjQxNC0uNDE0LS40MTQtMS4wODYgMC0xLjVhNS4yNSA1LjI1IDAgMCAxIDcuNSAwYy40MTQuNDE0LjQxNCAxLjA4NiAwIDEuNXMtMS4wODYuNDE0LTEuNSAwYTIuMjUgMi4yNSAwIDAgMC0zIDAgYy0uNDE0LjQxNC0xLjA4Ni40MTQtMS41IDB6IiBmaWxsPSIjMzM3M2RjIi8+CjxwYXRoIGQ9Ik02IDIwYy0uNTUyIDAtMS0uNDQ4LTEtMXMuNDQ4LTEgMS0xYzMuMzE0IDAgNi0yLjY4NiA2LTZzMi42ODYtNiA2LTZjLjU1MiAwIDEgLjQ0OCAxIDFzLS40NDggMS0xIDFjLTIuMjEgMC00IDEuNzktNCA0cy0xLjc5IDQtNCA0eiIgZmlsbD0iIzMzNzNkYyIvPgo8L3N2Zz4K';
        
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE media SET cover = ? WHERE category = ? AND type = ?',
                [defaultImage, 'radio', 'tunein'],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
        
        res.json({ message: 'Fixed radio station images', updated: 1 });
    } catch (error) {
        console.error('Error fixing radio images:', error);
        res.status(500).json({ error: 'Failed to fix radio images' });
    }
});

// Clean up all radio stations (temporary fix)
app.post('/api/cleanup-radio', async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM media WHERE category = ? AND type = ?', ['radio', 'tunein'], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
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
        
        const response = await fetch(`http://${host}:${port}/${encodeURIComponent(room)}/volume/${change}`);
        const result = await response.json();
        
        res.json(result);
    } catch (error) {
        console.error('Error changing volume on Sonos:', error);
        res.status(500).json({ error: 'Failed to change volume on Sonos' });
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

// Initialize and start server
async function startServer() {
    try {
        await initializeDatabase();
        await initializeSpotify();
        
        const port = process.env.PORT || 8200;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            console.log(`Open http://localhost:${port} in your browser`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});

startServer();
