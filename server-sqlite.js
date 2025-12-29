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
        
        const id = uuidv4();
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
        
        // Update client configuration
        await dbRun('UPDATE clients SET name = ?, room = ?, enableSpeakerSelection = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', 
                   [name, room, enableSpeakerSelection ? 1 : 0, clientId]);
        
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

// Sonos player control endpoints
app.get('/api/sonos', async (req, res) => {
    try {
        const { clientId } = req.query;
        
        // Get client's configured room
        const client = await dbGet('SELECT room FROM clients WHERE id = ?', [clientId]);
        const room = client?.room || 'Living Room';
        
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
        
        // Play on Sonos
        const url = uri ? 
            `http://${host}:${port}/${encodeURIComponent(room)}/spotify/now/${uri}` :
            `http://${host}:${port}/${encodeURIComponent(room)}/play`;
            
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
