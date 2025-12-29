const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create database directory
const dbDir = './server/data';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database('./server/data/database.sqlite');

// Create tables
db.serialize(() => {
    // Config table
    db.run(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL DEFAULT '1234',
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Clients table
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        room TEXT,
        enableSpeakerSelection INTEGER DEFAULT 1,
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Media items table
    db.run(`CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        type TEXT DEFAULT 'spotify',
        category TEXT DEFAULT 'music',
        title TEXT NOT NULL,
        artist TEXT,
        cover TEXT,
        spotifyUri TEXT,
        spotifyId TEXT,
        artistid TEXT,
        contentType TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES clients (id)
    )`);

    // Insert default admin user
    db.run(`INSERT OR IGNORE INTO users (username, pin) VALUES ('admin', '1234')`);

    console.log('Database initialized successfully');
});

db.close();
