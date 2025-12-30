// Setup
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
const jsonfile = require('jsonfile');
var SpotifyWebApi = require('spotify-web-api-node');
app.use(cors());

// Create config directory if it doesn't exist
if (!fs.existsSync('./server/config')) {
    fs.mkdirSync('./server/config', { recursive: true });
    console.log('Created config directory');
}

// Create config.json if it doesn't exist
if (!fs.existsSync('./server/config/config.json')) {
    const defaultConfig = {
        "node-sonos-http-api": {
            "server": "127.0.0.1",
            "port": "5005",
            "rooms": []
        },
        "spotify": {
            "clientId": "",
            "clientSecret": ""
        },
        "clients": {}
    };
    jsonfile.writeFileSync('./server/config/config.json', defaultConfig, { spaces: 4 });
    console.log('Created default config.json file');
}

// Load configuration
const config = require('./server/config/config.json');

// Initialize Spotify API
var spotifyApi = new SpotifyWebApi({
    clientId: config.spotify?.clientId || '',
    clientSecret: config.spotify?.clientSecret || ''
});

// Configuration
const dataFile = './server/config/data.json'
const pinFile = './server/config/pin.json'
const defaultPinFile = './server/config/pin-default.json'

// Create data.json if it doesn't exist
if (!fs.existsSync(dataFile)) {
    jsonfile.writeFileSync(dataFile, [], { spaces: 4 });
    console.log('Created empty data.json file');
}

// Don't create pin.json on startup - it will be created when PIN is first changed

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'www'))); // Static path to compiled Ionic app


// Routes
app.get('/api/data', (req, res) => {
    const clientId = req.query.clientId || 'default';
    const clientDataFile = `./server/config/data-${clientId}.json`;
    
    jsonfile.readFile(clientDataFile, (error, data) => {
        if (error) {
            // Try fallback to main data file for backward compatibility
            jsonfile.readFile(dataFile, (fallbackError, fallbackData) => {
                res.json(fallbackError ? [] : fallbackData);
            });
        } else {
            res.json(data);
        }
    });
});

app.post('/api/add', (req, res) => {
    const clientId = req.body.clientId || req.query.clientId || 'default';
    const clientDataFile = `./server/config/data-${clientId}.json`;
    
    jsonfile.readFile(clientDataFile, (error, data) => {
        if (error) data = [];
        data.push(req.body);

        jsonfile.writeFile(clientDataFile, data, { spaces: 4 }, (writeError) => {
            res.status(writeError ? 500 : 200).send();
        });
    });
});

app.post('/api/delete', (req, res) => {
    const clientId = req.body.clientId || req.query.clientId || 'default';
    const clientDataFile = `./server/config/data-${clientId}.json`;
    
    jsonfile.readFile(clientDataFile, (error, data) => {
        if (error) data = [];
        data.splice(req.body.index, 1);

        jsonfile.writeFile(clientDataFile, data, { spaces: 4 }, (writeError) => {
            res.status(writeError ? 500 : 200).send();
        });
    });
});

app.get('/api/token', (req, res) => {
    // Retrieve an access token from Spotify
    spotifyApi.clientCredentialsGrant().then(
        function(data) {
            res.status(200).send(data.body['access_token']);
        },
        function(err) {
            console.log(
                'Something went wrong when retrieving a new Spotify access token',
                err.message
            );

            res.status(500).send(err.message);
        }
    );
});

app.get('/api/spotify/artist-albums', (req, res) => {
    const { artistId, offset = 0, limit = 20 } = req.query;
    
    if (!artistId) {
        return res.status(400).json({ error: 'Artist ID is required' });
    }

    // Check if Spotify is configured
    if (!config.spotify?.clientId || !config.spotify?.clientSecret) {
        return res.status(500).json({ 
            error: 'Spotify not configured',
            details: 'Please configure Spotify credentials in settings'
        });
    }

    // Get access token and fetch artist albums
    spotifyApi.clientCredentialsGrant().then(
        function(data) {
            spotifyApi.setAccessToken(data.body['access_token']);
            
            return spotifyApi.getArtistAlbums(artistId, {
                include_groups: 'album,single',
                market: 'DE',
                offset: parseInt(offset),
                limit: parseInt(limit)
            });
        }
    ).then(
        function(data) {
            res.json({ albums: data.body });
        }
    ).catch(
        function(err) {
            console.error('Spotify API Error:', {
                message: err.message,
                statusCode: err.statusCode,
                body: err.body
            });
            
            let errorMessage = 'Failed to fetch artist albums';
            let statusCode = 500;
            
            if (err.statusCode === 401) {
                errorMessage = 'Spotify authentication failed. Please check your credentials.';
                statusCode = 401;
            } else if (err.statusCode === 429) {
                errorMessage = 'Spotify rate limit exceeded. Please wait and try again.';
                statusCode = 429;
            } else if (err.statusCode === 404) {
                errorMessage = 'Artist not found on Spotify.';
                statusCode = 404;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            res.status(statusCode).json({ 
                error: errorMessage,
                details: err.body || err.message || 'Unknown error'
            });
        }
    );
});

app.get('/api/sonos', (req, res) => {
    const clientId = req.query.clientId || 'default';
    const clientRoom = config.clients?.[clientId]?.room || config['node-sonos-http-api']?.rooms?.[0] || '';
    
    res.status(200).send({
        ...config['node-sonos-http-api'],
        rooms: [clientRoom]
    });
});

app.get('/api/config', (req, res) => {
    const clientId = req.query.clientId || 'default';
    const clientConfig = {
        spotify: {
            configured: !!(config.spotify?.clientId && config.spotify?.clientSecret)
        },
        currentRoom: config.clients?.[clientId]?.room || config['node-sonos-http-api']?.rooms?.[0] || '',
        clientId: clientId
    };
    res.status(200).send(clientConfig);
});

app.get('/api/speakers', (req, res) => {
    const sonosUrl = `http://${config['node-sonos-http-api'].server}:${config['node-sonos-http-api'].port}/zones`;
    
    require('http').get(sonosUrl, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch {
                res.status(500).json([]);
            }
        });
    }).on('error', () => res.status(500).json([]));
});

app.post('/api/config/speaker', (req, res) => {
    const clientId = req.body.clientId || 'default';
    
    if (!config.clients) config.clients = {};
    config.clients[clientId] = { room: req.body.speaker };
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save configuration' : 'Speaker configuration saved');
    });
});

app.post('/api/config/pin', (req, res) => {
    jsonfile.readFile(pinFile, (error, pinData) => {
        if (error) {
            // pin.json doesn't exist, read from default
            jsonfile.readFile(defaultPinFile, (defaultError, defaultPinData) => {
                const currentPin = defaultError ? '1234' : defaultPinData.pin;
                
                if (currentPin !== req.body.currentPin) {
                    return res.status(401).send('Current PIN incorrect');
                }
                
                // Create pin.json with new PIN
                const newPinData = { pin: req.body.newPin };
                jsonfile.writeFile(pinFile, newPinData, { spaces: 4 }, (writeError) => {
                    res.status(writeError ? 500 : 200).send(writeError ? 'Failed to save PIN' : 'PIN changed successfully');
                });
            });
        } else {
            // pin.json exists, use it
            if (pinData.pin !== req.body.currentPin) {
                return res.status(401).send('Current PIN incorrect');
            }
            
            pinData.pin = req.body.newPin;
            jsonfile.writeFile(pinFile, pinData, { spaces: 4 }, (writeError) => {
                res.status(writeError ? 500 : 200).send(writeError ? 'Failed to save PIN' : 'PIN changed successfully');
            });
        }
    });
});

app.get('/api/pin', (req, res) => {
    jsonfile.readFile(pinFile, (error, pinData) => {
        if (error) {
            // pin.json doesn't exist, read from default
            jsonfile.readFile(defaultPinFile, (defaultError, defaultPinData) => {
                res.send(defaultError ? '1234' : defaultPinData.pin);
            });
        } else {
            res.send(pinData.pin);
        }
    });
});

app.get('/api/config/full', (req, res) => {
    res.json(config);
});

app.post('/api/config/spotify', (req, res) => {
    config.spotify = {
        clientId: req.body.clientId,
        clientSecret: req.body.clientSecret
    };
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save Spotify config' : 'Spotify config saved');
    });
});

app.post('/api/config/sonos', (req, res) => {
    config['node-sonos-http-api'] = {
        ...config['node-sonos-http-api'],
        server: req.body.server,
        port: req.body.port
    };
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save Sonos config' : 'Sonos config saved');
    });
});

app.post('/api/config/amazon', (req, res) => {
    config.amazonmusic = {
        accessKey: req.body.accessKey,
        secretKey: req.body.secretKey
    };
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save Amazon config' : 'Amazon config saved');
    });
});

app.post('/api/config/apple', (req, res) => {
    config.applemusic = {
        developerToken: req.body.developerToken,
        teamId: req.body.teamId
    };
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save Apple config' : 'Apple config saved');
    });
});

app.post('/api/config/tunein', (req, res) => {
    config.tunein = {
        apiKey: req.body.apiKey,
        partnerId: req.body.partnerId
    };
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save TuneIn config' : 'TuneIn config saved');
    });
});

app.get('/api/search/spotify', (req, res) => {
    const { query, type = 'album' } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Get Spotify access token
    getSpotifyAccessToken((error, token) => {
        if (error) {
            console.error('Failed to get Spotify token:', error);
            return res.status(500).json({ error: 'Failed to authenticate with Spotify' });
        }

        const searchType = type === 'show' ? 'show' : 'album';
        const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=20`;

        const options = {
            url: spotifyUrl,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            json: true
        };

        request(options, (error, response, body) => {
            if (error) {
                console.error('Spotify search error:', error);
                return res.status(500).json({ error: 'Failed to search Spotify' });
            }

            if (response.statusCode !== 200) {
                console.error('Spotify API error:', response.statusCode, body);
                return res.status(response.statusCode).json({ error: 'Spotify API error' });
            }

            const results = {
                albums: [],
                shows: []
            };

            if (searchType === 'album' && body.albums) {
                results.albums = body.albums.items.map(album => ({
                    id: album.id,
                    title: album.name,
                    artist: album.artists[0]?.name || 'Unknown Artist',
                    cover: album.images[0]?.url || '../assets/images/nocover.png'
                }));
            } else if (searchType === 'show' && body.shows) {
                results.shows = body.shows.items.map(show => ({
                    id: show.id,
                    title: show.name,
                    artist: show.publisher || 'Unknown Publisher',
                    cover: show.images[0]?.url || '../assets/images/nocover.png'
                }));
            }

            res.json(results);
        });
    });
});

app.get('/api/search/amazon', (req, res) => {
    const { query, type = 'album' } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Mock Amazon Music search - replace with actual API integration
    const mockResults = {
        albums: [
            {
                id: 'amazon_' + Date.now(),
                title: `${query} - Sample Album`,
                artist: 'Sample Artist',
                cover: 'https://via.placeholder.com/300x300?text=Amazon+Music'
            }
        ]
    };
    
    res.json(mockResults);
});

app.get('/api/search/apple', (req, res) => {
    const { query, type = 'album' } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Mock Apple Music search - replace with actual API integration
    const mockResults = {
        albums: [
            {
                id: 'apple_' + Date.now(),
                title: `${query} - Sample Album`,
                artist: 'Sample Artist',
                cover: 'https://via.placeholder.com/300x300?text=Apple+Music'
            }
        ]
    };
    
    res.json(mockResults);
});

app.get('/api/search/tunein', (req, res) => {
    const { query, type = 'station' } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Mock TuneIn search - replace with actual API integration
    const mockResults = {
        stations: [
            {
                id: 'tunein_' + Date.now(),
                title: `${query} Radio`,
                artist: 'Radio Station',
                cover: 'https://via.placeholder.com/300x300?text=TuneIn+Radio'
            }
        ]
    };
    
    res.json(mockResults);
});

app.get('/api/config/client', (req, res) => {
    const clientId = req.query.clientId || 'default';
    const clientConfig = config.clients?.[clientId] || {};
    res.json({ 
        name: clientConfig.name || '',
        enableSpeakerSelection: clientConfig.enableSpeakerSelection !== false
    });
});

app.post('/api/config/client', (req, res) => {
    const clientId = req.body.clientId || 'default';
    
    if (!config.clients) config.clients = {};
    if (!config.clients[clientId]) config.clients[clientId] = {};
    
    if (req.body.name !== undefined) {
        config.clients[clientId].name = req.body.name;
    }
    if (req.body.enableSpeakerSelection !== undefined) {
        config.clients[clientId].enableSpeakerSelection = req.body.enableSpeakerSelection;
    }
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to save client config' : 'Client config saved');
    });
});

app.get('/api/clients', (req, res) => {
    const clients = Object.keys(config.clients || {}).map(id => ({
        id,
        name: config.clients[id].name || '',
        room: config.clients[id].room || ''
    }));
    res.json(clients);
});

app.post('/api/clients/create', (req, res) => {
    const clientId = req.body.clientId;
    const clientName = req.body.name;
    
    if (!config.clients) config.clients = {};
    config.clients[clientId] = {
        name: clientName,
        room: ''
    };
    
    // Create empty data file for new client
    const clientDataFile = `./server/config/data-${clientId}.json`;
    if (!fs.existsSync(clientDataFile)) {
        jsonfile.writeFileSync(clientDataFile, [], { spaces: 4 });
    }
    
    jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
        res.status(error ? 500 : 200).send(error ? 'Failed to create client' : 'Client created successfully');
    });
});

app.post('/api/clients/delete', (req, res) => {
    const clientId = req.body.clientId;
    
    if (config.clients && config.clients[clientId]) {
        delete config.clients[clientId];
        
        // Delete client data file
        const clientDataFile = `./server/config/data-${clientId}.json`;
        if (fs.existsSync(clientDataFile)) {
            fs.unlinkSync(clientDataFile);
        }
        
        jsonfile.writeFile('./server/config/config.json', config, { spaces: 4 }, (error) => {
            res.status(error ? 500 : 200).send(error ? 'Failed to delete client' : 'Client deleted successfully');
        });
    } else {
        res.status(404).send('Client not found');
    }
});

// Catch all other routes and return the index file from Ionic app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'www/index.html'));
});

// listen (start app with 'node server.js')
app.listen(8200);
console.log("App listening on port 8200");