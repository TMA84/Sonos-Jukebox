-- Add UNIQUE constraint on (id, clientId) combination instead of changing primary key
-- This allows same content for different clients without dropping the table

-- First, remove any duplicate entries that would violate the new constraint
DELETE FROM media_items 
WHERE rowid NOT IN (
    SELECT MIN(rowid) 
    FROM media_items 
    GROUP BY id, clientId
);

-- Add unique constraint on the combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_items_id_client 
ON media_items(id, clientId);
