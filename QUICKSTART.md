# Quick Start Guide

Get up and running with Sonos Jukebox v3.0 in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version (need 9+)
npm --version

# Check if Docker is installed (optional)
docker --version
```

## Installation

### Option 1: Local Development (Recommended for Development)

```bash
# 1. Clone the repository
git clone https://github.com/TMA84/sonos-jukebox.git
cd sonos-jukebox

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# 4. Edit .env with your settings
nano .env
# At minimum, set:
# - SPOTIFY_CLIENT_ID
# - SPOTIFY_CLIENT_SECRET
# - SONOS_API_HOST
# - SONOS_API_PORT

# 5. Run database migrations
npm run migrate:run

# 6. Start development server
npm run dev
```

Open `http://localhost:8200` in your browser.

### Option 2: Docker (Recommended for Production)

```bash
# 1. Clone the repository
git clone https://github.com/TMA84/sonos-jukebox.git
cd sonos-jukebox

# 2. Create .env file
cp .env.example .env
nano .env

# 3. Start with Docker Compose
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Access the app
# Open http://localhost:8200
```

### Option 3: Production Build

```bash
# 1. Install and configure (steps 1-4 from Option 1)

# 2. Build the application
npm run build

# 3. Start production server
npm run start:prod
```

## First Time Setup

1. **Open the App**
   - Navigate to `http://localhost:8200`

2. **Access Configuration**
   - Click the gear icon (⚙️) in the top-right
   - Enter PIN: `1234` (default)

3. **Configure Sonos**
   - Enter your Sonos HTTP API host (e.g., `192.168.1.100`)
   - Enter port (default: `5005`)
   - Click "Save"

4. **Configure Spotify**
   - Enter your Spotify Client ID
   - Enter your Spotify Client Secret
   - Click "Save"

5. **Create a Client Profile**
   - Click "Create New Client"
   - Enter a name (e.g., "Kids Room")
   - Select a Sonos speaker
   - Click "Create"

6. **Add Music**
   - Tap the top-right corner 10 times quickly
   - Click the "+" button
   - Search for albums or artists
   - Tap to add to library

## Migrating from v2.x

If you're upgrading from v2.1.8:

```bash
# 1. Backup your data
mkdir backup
cp -r server/config backup/

# 2. Install new version
npm install

# 3. Setup environment
cp .env.example .env
nano .env

# 4. Run migration script
npm run migrate:from-v2

# 5. Start the server
npm start
```

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed instructions.

## Common Commands

### Development
```bash
npm run dev              # Start full stack dev server
npm run client:dev       # Start Angular only
npm run server:dev       # Start Node.js only
```

### Testing
```bash
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run E2E tests
npm run test:e2e:open    # Open Cypress UI
```

### Code Quality
```bash
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
```

### Building
```bash
npm run build            # Build everything
npm run build:client     # Build Angular app
npm run build:server     # Build Node.js server
```

### Docker
```bash
npm run docker:build     # Build Docker image
npm run docker:run       # Start containers
npm run docker:stop      # Stop containers
```

## Troubleshooting

### Port 8200 Already in Use

```bash
# Option 1: Change port in .env
PORT=8201

# Option 2: Kill process using port
lsof -ti:8200 | xargs kill -9
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
rm server/data/database.sqlite
npm run migrate:run
```

### Spotify Not Working

```bash
# Check Spotify status
curl http://localhost:8200/api/spotify/status

# Verify credentials in .env
cat .env | grep SPOTIFY
```

### Sonos Not Found

```bash
# Test Sonos API directly
curl http://YOUR_SONOS_HOST:5005/zones

# Check if node-sonos-http-api is running
ps aux | grep sonos
```

### Build Errors

```bash
# Clear caches and reinstall
rm -rf node_modules .angular dist www
npm install
npm run build
```

## Development Workflow

### Making Changes

```bash
# 1. Create a branch
git checkout -b feat/my-feature

# 2. Make changes
# Edit files...

# 3. Test your changes
npm run lint
npm test
npm run build

# 4. Commit
git add .
git commit -m "feat: add my feature"

# 5. Push
git push origin feat/my-feature
```

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Watch mode for TDD
npm run test:watch
```

### Debugging

```bash
# VS Code: Press F5 to start debugging
# Or use the Debug panel and select:
# - "Debug Server" for backend
# - "Debug Client" for frontend
# - "Full Stack" for both
```

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8200/api-docs`
- **Health Check**: `http://localhost:8200/health`

## Environment Variables

Key variables to configure:

```bash
# Server
PORT=8200
NODE_ENV=development

# Database
DATABASE_PATH=./server/data/database.sqlite

# Sonos
SONOS_API_HOST=192.168.1.100
SONOS_API_PORT=5005

# Spotify (required)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Security
JWT_SECRET=your-random-secret-key
DEFAULT_PIN=1234
```

See `.env.example` for all available options.

## Project Structure

```
sonos-jukebox/
├── src/                 # Angular frontend
├── server/src/          # Node.js backend
├── cypress/             # E2E tests
├── .github/workflows/   # CI/CD
├── .vscode/             # VS Code config
└── docs/                # Documentation
```

## Getting Help

- **Documentation**: Check the [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/TMA84/sonos-jukebox/issues)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Migration**: See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

## Next Steps

1. ✅ Get the app running
2. ✅ Configure Sonos and Spotify
3. ✅ Create a client profile
4. ✅ Add some music
5. 📖 Read the [full documentation](README.md)
6. 🛠️ Start developing (see [CONTRIBUTING.md](CONTRIBUTING.md))
7. 🚀 Deploy to production

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run tests | `npm test` |
| Build for production | `npm run build` |
| Start production | `npm run start:prod` |
| Lint code | `npm run lint` |
| Format code | `npm run format` |
| Run migrations | `npm run migrate:run` |
| Docker start | `docker-compose up -d` |
| View logs | `docker-compose logs -f` |
| API docs | `http://localhost:8200/api-docs` |

---

**Ready to go!** 🎉

If you run into any issues, check the [Troubleshooting](#troubleshooting) section or open an issue on GitHub.
