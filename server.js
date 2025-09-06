// Setup
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
const jsonfile = require('jsonfile');
var SpotifyWebApi = require('spotify-web-api-node');
const config = require('./server/config/config.json');

app.use(cors());

var spotifyApi = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret
});

// Configuration
const dataFile = './server/config/data.json'
const pinFile = './server/config/pin.json'

// Create data.json if it doesn't exist
if (!fs.existsSync(dataFile)) {
    jsonfile.writeFileSync(dataFile, [], { spaces: 4 });
    console.log('Created empty data.json file');
}

// Create pin.json if it doesn't exist
if (!fs.existsSync(pinFile)) {
    jsonfile.writeFileSync(pinFile, { pin: '1234' }, { spaces: 4 });
    console.log('Created default PIN file');
}

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
        if (error) pinData = { pin: '1234' };
        
        if (pinData.pin !== req.body.currentPin) {
            return res.status(401).send('Current PIN incorrect');
        }
        
        pinData.pin = req.body.newPin;
        jsonfile.writeFile(pinFile, pinData, { spaces: 4 }, (writeError) => {
            res.status(writeError ? 500 : 200).send(writeError ? 'Failed to save PIN' : 'PIN changed successfully');
        });
    });
});

app.get('/api/pin', (req, res) => {
    jsonfile.readFile(pinFile, (error, pinData) => {
        res.send((pinData || { pin: '1234' }).pin);
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

// Catch all other routes and return the index file from Ionic app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'www/index.html'));
});

// listen (start app with 'node server.js')
app.listen(8200);
console.log("App listening on port 8200");