-- Create new table with composite primary key
CREATE TABLE media_items_new (
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
);

-- Copy data from old table (if it exists)
INSERT OR IGNORE INTO media_items_new 
SELECT * FROM media_items WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='media_items');

-- Drop old table and rename new one
DROP TABLE IF EXISTS media_items;
ALTER TABLE media_items_new RENAME TO media_items;
