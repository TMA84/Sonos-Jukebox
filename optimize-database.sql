-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_items_client_id ON media_items(clientId);
CREATE INDEX IF NOT EXISTS idx_media_items_category ON media_items(category);
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(createdAt);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(isActive);
CREATE INDEX IF NOT EXISTS idx_config_key ON config(key);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(isActive);
