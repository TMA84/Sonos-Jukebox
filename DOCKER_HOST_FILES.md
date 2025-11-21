# Adding Host Files to Docker Container

This guide explains how to add files from your Docker host to the Sonos Kids Controller app.

## Method 1: Volume Mounts (Runtime Access)

Volume mounts allow the container to access files on your host system at runtime.

### Edit docker-compose.yml

```yaml
volumes:
  - ./server/config:/app/server/config
  - /path/on/host:/path/in/container:ro
```

### Common Use Cases

#### 1. Mount Music Library
```yaml
volumes:
  - /home/user/Music:/app/media/music:ro
```

#### 2. Mount Custom Cover Images
```yaml
volumes:
  - /home/user/album-covers:/app/www/assets/covers:ro
```

#### 3. Mount Data Directory
```yaml
volumes:
  - /mnt/nas/sonos-data:/app/data:rw
```

**Note:** 
- `:ro` = read-only (recommended for media files)
- `:rw` = read-write (for data that needs to be modified)

### Serve Mounted Files via Express

Edit `server.js` to add static file routes:

```javascript
// Serve mounted media files
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/covers', express.static(path.join(__dirname, 'www/assets/covers')));
```

Then access files at: `http://localhost:8200/media/song.mp3`

## Method 2: Copy Files During Build

If you want files permanently in the image, add to `Dockerfile`:

```dockerfile
# Copy files from host during build
COPY /path/on/host/files ./destination/in/container
```

**Example:**
```dockerfile
# Copy custom assets
COPY ./custom-assets ./www/assets/custom
```

Then rebuild: `docker-compose build`

## Method 3: Environment Variables for Paths

Pass host paths as environment variables:

```yaml
environment:
  - MEDIA_PATH=/app/media
  - CUSTOM_ASSETS=/app/assets/custom
```

Access in Node.js:
```javascript
const mediaPath = process.env.MEDIA_PATH || './media';
```

## Complete Example

### docker-compose.yml
```yaml
services:
  sonos-kids-controller:
    build: .
    ports:
      - "8200:8200"
    volumes:
      - ./server/config:/app/server/config
      - /mnt/music:/app/media/music:ro
      - /home/user/covers:/app/www/assets/covers:ro
    environment:
      - NODE_ENV=production
      - MEDIA_PATH=/app/media/music
    restart: unless-stopped
```

### server.js
```javascript
// Serve mounted directories
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/covers', express.static('/app/www/assets/covers'));

// API endpoint to list files
app.get('/api/media/list', (req, res) => {
    const mediaPath = process.env.MEDIA_PATH || './media';
    fs.readdir(mediaPath, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ files });
    });
});
```

## Usage

1. Edit `docker-compose.yml` with your host paths
2. Optionally edit `server.js` to serve the files
3. Restart container:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Troubleshooting

### Permission Issues
If you get permission errors:
```bash
# On host, make files readable
chmod -R 755 /path/to/files

# Or change ownership to match container user (node = UID 1000)
chown -R 1000:1000 /path/to/files
```

### Files Not Appearing
- Check the path exists on host
- Verify the mount in container: `docker-compose exec sonos-kids-controller ls -la /app/media`
- Check Docker logs: `docker-compose logs`

### SELinux Issues (Linux)
If using SELinux, add `:z` flag:
```yaml
volumes:
  - /path/on/host:/path/in/container:ro,z
```
