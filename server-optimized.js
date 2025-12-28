const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const SpotifyWebApi = require('spotify-web-api-node');
const { v4: uuidv4 } = require('crypto');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize cache (TTL: 5 minutes for most data, 1 hour for config)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Create database directory
const dbDir = './server/data';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database with optimizations
const db = new sqlite3.Database('./server/data/database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        // Enable WAL mode for better concurrent access
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = 1000');
        db.run('PRAGMA temp_store = MEMORY');
    }
});

// Database helper functions with caching
const dbGet = (sql, params = [], cacheKey = null, ttl = 300) => {
    return new Promise((resolve, reject) => {
        // Check cache first
        if (cacheKey && cache.has(cacheKey)) {
            return resolve(cache.get(cacheKey));
        }
        
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                // Cache the result
                if (cacheKey && row) {
                    cache.set(cacheKey, row, ttl);
                }
                resolve(row);
            }
        });
    });
};

const dbAll = (sql, params = [], cacheKey = null, ttl = 300) => {
    return new Promise((resolve, reject) => {
        // Check cache first
        if (cacheKey && cache.has(cacheKey)) {
            return resolve(cache.get(cacheKey));
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Cache the result
                if (cacheKey && rows) {
                    cache.set(cacheKey, rows, ttl);
                }
                resolve(rows);
            }
        });
    });
};

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                // Clear related cache entries
                clearRelatedCache(sql);
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

// Cache invalidation helper
const clearRelatedCache = (sql) => {
    const sqlLower = sql.toLowerCase();
    if (sqlLower.includes('clients')) {
        cache.del('clients_all');
        cache.flushAll(); // Clear all client-related cache
    } else if (sqlLower.includes('media_items')) {
        // Clear media cache for all clients
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.startsWith('media_') || key.startsWith('client_')) {
                cache.del(key);
            }
        });
    } else if (sqlLower.includes('config')) {
        cache.del('config_all');
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.startsWith('config_')) {
                cache.del(key);
            }
        });
    }
};

// Initialize Spotify API with caching
let spotifyApi;
let spotifyTokenExpiry = 0;

async function initializeSpotify() {
    try {
        const clientId = await dbGet('SELECT value FROM config WHERE key = ?', ['spotify_client_id'], 'config_spotify_client_id', 3600);
        const clientSecret = await dbGet('SELECT value FROM config WHERE key = ?', ['spotify_client_secret'], 'config_spotify_client_secret', 3600);
        
        spotifyApi = new SpotifyWebApi({
            clientId: clientId?.value || '',
            clientSecret: clientSecret?.value || ''
        });
        
        if (clientId?.value && clientSecret?.value) {
            await refreshSpotifyToken();
            console.log('Spotify API initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing Spotify API:', error.message);
    }
}

// Token refresh with caching
async function refreshSpotifyToken() {
    try {
        // Check if token is still valid (with 5 minute buffer)
        if (Date.now() < spotifyTokenExpiry - 300000) {
            return spotifyApi.getAccessToken();
        }
        
        const data = await spotifyApi.clientCredentialsGrant();
        const token = data.body['access_token'];
        const expiresIn = data.body['expires_in'] * 1000; // Convert to milliseconds
        
        spotifyApi.setAccessToken(token);
        spotifyTokenExpiry = Date.now() + expiresIn;
        
        return token;
    } catch (error) {
        console.error('Error refreshing Spotify token:', error.message);
        throw error;
    }
}

// Optimized API Routes

// Get configuration with caching
app.get('/api/config', async (req, res) => {
    try {
        const { clientId } = req.query;
        
        if (clientId) {
            const client = await dbGet('SELECT * FROM clients WHERE id = ?', [clientId], `client_${clientId}`, 600);
            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }
            res.json(client);
        } else {
            const configs = await dbAll('SELECT * FROM config', [], 'config_all', 3600);
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

// Get full configuration (legacy endpoint)
app.get('/api/config/full', async (req, res) => {
    try {
        const configs = await dbAll('SELECT * FROM config', [], 'config_all', 3600);
        const configObj = {};
        configs.forEach(config => {
            configObj[config.key] = config.value;
        });
        res.json(configObj);
    } catch (error) {
        console.error('Error getting full config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get client configuration (legacy endpoint)
app.get('/api/config/client', async (req, res) => {
    try {
        const { clientId } = req.query;
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }
        
        const client = await dbGet('SELECT * FROM clients WHERE id = ?', [clientId], `client_${clientId}`, 600);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        console.error('Error getting client config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update configuration with cache invalidation
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

// Get clients with caching
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await dbAll('SELECT * FROM clients WHERE isActive = 1 ORDER BY name', [], 'clients_all', 600);
        res.json(clients);
    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create client (manual configuration only)
app.post('/api/clients', async (req, res) => {
    try {
        const { id, name, room, enableSpeakerSelection = true } = req.body;
        
        if (!id || id.trim() === '') {
            return res.status(400).json({ error: 'Client ID is required' });
        }
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        const finalId = id.trim();
        
        // Check if ID already exists
        const existing = await dbGet('SELECT id FROM clients WHERE id = ?', [finalId]);
        if (existing) {
            return res.status(400).json({ error: 'Client ID already exists' });
        }
        
        await dbRun('INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)', 
                   [finalId, name.trim(), room || '', enableSpeakerSelection ? 1 : 0]);
        
        const client = await dbGet('SELECT * FROM clients WHERE id = ?', [finalId]);
        res.json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Legacy create client endpoint
app.post('/api/clients/create', async (req, res) => {
    try {
        const { id, name, room, enableSpeakerSelection = true } = req.body;
        
        if (!id || id.trim() === '') {
            return res.status(400).json({ error: 'Client ID is required' });
        }
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        const finalId = id.trim();
        
        // Check if ID already exists
        const existing = await dbGet('SELECT id FROM clients WHERE id = ?', [finalId]);
        if (existing) {
            return res.status(400).json({ error: 'Client ID already exists' });
        }
        
        await dbRun('INSERT INTO clients (id, name, room, enableSpeakerSelection) VALUES (?, ?, ?, ?)', 
                   [finalId, name.trim(), room || '', enableSpeakerSelection ? 1 : 0]);
        
        const client = await dbGet('SELECT * FROM clients WHERE id = ?', [finalId]);
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
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Delete associated media items first
        await dbRun('DELETE FROM media_items WHERE clientId = ?', [id]);
        
        // Delete client
        const result = await dbRun('DELETE FROM clients WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get media data with caching and pagination
app.get('/api/data', async (req, res) => {
    try {
        const { clientId, category, limit = 50, offset = 0 } = req.query;
        
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }
        
        let sql = 'SELECT * FROM media_items WHERE clientId = ?';
        let params = [clientId];
        let cacheKey = `media_${clientId}`;
        
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
            cacheKey += `_${category}`;
        }
        
        sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        cacheKey += `_${limit}_${offset}`;
        
        const mediaItems = await dbAll(sql, params, cacheKey, 300);
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

// Get Spotify token with caching
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

// PIN verification with rate limiting
const pinAttempts = new Map();
app.post('/api/auth/pin/verify', async (req, res) => {
    try {
        const { pin, clientId } = req.body;
        const clientIP = req.ip;
        
        // Rate limiting: max 5 attempts per minute per IP
        const attempts = pinAttempts.get(clientIP) || { count: 0, resetTime: Date.now() + 60000 };
        if (Date.now() > attempts.resetTime) {
            attempts.count = 0;
            attempts.resetTime = Date.now() + 60000;
        }
        
        if (attempts.count >= 5) {
            return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
        }
        
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin'], 'user_admin', 3600);
        
        if (user && user.pin === pin) {
            // Reset attempts on successful login
            pinAttempts.delete(clientIP);
            const token = Buffer.from(`${Date.now()}-${clientId}`).toString('base64');
            res.json({ token });
        } else {
            attempts.count++;
            pinAttempts.set(clientIP, attempts);
            res.status(401).json({ error: 'Invalid PIN' });
        }
    } catch (error) {
        console.error('Error verifying PIN:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PIN change
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

// Legacy PIN endpoints
app.get('/api/pin', async (req, res) => {
    try {
        const user = await dbGet('SELECT pin FROM users WHERE username = ? AND isActive = 1', ['admin'], 'user_admin_pin', 3600);
        res.json({ pin: user?.pin || '1234' });
    } catch (error) {
        console.error('Error getting PIN:', error);
        res.status(500).json({ error: 'Error getting PIN' });
    }
});

app.post('/api/config/pin', async (req, res) => {
    try {
        const { currentPin, newPin } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin']);
        
        if (!user || user.pin !== currentPin) {
            return res.status(401).json({ error: 'Current PIN incorrect' });
        }
        
        await dbRun('UPDATE users SET pin = ?, updatedAt = CURRENT_TIMESTAMP WHERE username = ?', [newPin, 'admin']);
        res.json({ message: 'PIN changed successfully' });
    } catch (error) {
        console.error('Error updating PIN:', error);
        res.status(500).json({ error: 'Failed to save PIN' });
    }
});

// Legacy PIN verification
app.post('/api/pin/verify', async (req, res) => {
    try {
        const { pin } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND isActive = 1', ['admin'], 'user_admin', 3600);
        
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

// Health check with cache stats
app.get('/api/health', (req, res) => {
    const stats = cache.getStats();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cache: {
            keys: stats.keys,
            hits: stats.hits,
            misses: stats.misses,
            hitRate: stats.hits / (stats.hits + stats.misses) || 0
        },
        memory: process.memoryUsage()
    });
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
            console.log(`Optimized SQLite server running on port ${port}`);
            console.log(`Health check: http://localhost:${port}/api/health`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

// Graceful shutdown with cache cleanup
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    cache.close();
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
