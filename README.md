# Sonos Kids Controller - Enhanced Edition

*This enhanced version builds upon the original work by [Thyraz](https://github.com/Thyraz/Sonos-Kids-Controller) with significant performance improvements, new features, and bug fixes.*

## Quick Start

### Prerequisites
- Node.js and npm installed
- [node-sonos-http-api](https://github.com/Thyraz/node-sonos-http-api) running
- Spotify Premium account (optional, for music and audiobooks)
- TuneIn Radio (works automatically, no setup required)

### Installation
```bash
# Clone and setup
git clone https://github.com/your-repo/Sonos-Kids-Controller.git
cd Sonos-Kids-Controller
npm install
npm run build

# Start the server
npm start
```

### First Time Setup
1. Open `http://localhost:8200` in your browser
2. Tap the clock display 5 times to open the hidden settings menu, then enter PIN (default: 1234)
3. Configure your Sonos speakers and Spotify credentials (TuneIn Radio works automatically)
4. Create your first client profile
5. Add music content using the search functionality

## Customer Handbook

### Getting Started

#### Accessing the Settings (Hidden Config Menu)

The settings menu has no visible button — this keeps the interface clean for children.

**To open settings:** Tap the clock display in the top bar **5 times in quick succession** (within 3 seconds). The PIN prompt will appear.

- Default PIN: `1234`
- The tap count resets automatically after 3 seconds if not completed

#### Creating Your First Profile
1. **Access Settings**: Tap the clock 5 times and enter PIN (default: `1234`)
2. **Create Client**: Click "Create New Client" and give it a name (e.g., "Kids Room")
3. **Select Speaker**: Choose which Sonos speaker this profile should use

#### Adding Music Content

##### Unified Search Interface
1. **Access Config**: Tap the clock 5 times and enter PIN
2. **Library Tab**: Navigate to the Library tab
3. **Content Types**: Choose from Audiobook, Music, Playlist, Radio, Podcast, or Radio Play
4. **Search Sources**: Select Spotify, Local, or TuneIn Radio
5. **Search Options**:
   - **Spotify Albums**: Search by album name and add directly
   - **Spotify Artists**: Add entire artist catalogs with one click
   - **Spotify Podcasts**: Search and add podcast shows with episode support
   - **Spotify Audiobooks**: Search and add audiobooks with chapter-based playback
   - **TuneIn Radio**: Search for live radio stations by name or genre
   - **Manual Entry**: Add specific content with custom artwork URLs

##### Edit Existing Content
1. **Library Items List**: View all your saved content in the Library tab
2. **Edit Button**: Click the pencil icon next to any item
3. **Modify Details**: Change artist, title, category, source, or content type
4. **Save Changes**: Click "Update Item" to save or "Cancel Edit" to abort

##### Search Examples
- `artist:Benjamin Blümchen` - All Benjamin Blümchen content
- `artist:"Paw Patrol" album:folge` - Specific Paw Patrol episodes
- `Grüffelo` - All Grüffelo content

#### Managing Multiple Profiles
1. **Switch Clients**: Use the dropdown in settings to switch between profiles
2. **Direct Access**: Bookmark `http://localhost:8200?client=ProfileName` for quick access
3. **Individual Settings**: Each profile has its own speaker and music library

### Daily Usage

#### Playing Music
1. **Browse Categories**: Switch between Audiobook, Music, Playlist, Radio, Podcast, and Radio Play
2. **Artist View**: Tap artist covers to see their albums
3. **Podcast Episodes**: View individual episodes for podcasts instead of show overview
4. **Audiobook Chapters**: Audiobooks automatically play first chapter with proper Sonos compatibility
5. **Radio Stations**: TuneIn radio stations play directly through Sonos speakers
6. **Direct Play**: Tap any album cover to start playing immediately
7. **Voice Feedback**: Tap artist/album names to hear them spoken aloud

#### Search and Filter
1. **Enable Search**: Tap the search icon to show the search bar
2. **Type or Use Keyboard**: Use the on-screen keyboard or type directly
3. **Real-time Results**: See filtered results as you type

#### Player Controls
- **Volume**: Use the volume slider in the player
- **Skip Tracks**: Use next/previous buttons
- **Pause/Play**: Tap the play/pause button
- **Quick Access**: Use the player shortcut button from the home screen

### Troubleshooting

#### No Music Showing
1. **Check Client**: Ensure you're using the correct client profile
2. **Verify Spotify**: Make sure Spotify credentials are configured in settings
3. **Refresh Data**: Try switching categories or reloading the page
4. **Check Network**: Ensure your device can reach the Sonos speakers

#### Spotify Issues
1. **Rate Limiting**: The app automatically handles Spotify rate limits - just wait
2. **Token Expired**: Tokens refresh automatically, but you may need to wait a moment
3. **No Results**: Try different search terms or check your Spotify subscription

#### Speaker Not Found
1. **Check Network**: Ensure Sonos speakers are on the same network
2. **Refresh Speakers**: Go to settings and refresh the speaker list
3. **Verify API**: Make sure node-sonos-http-api is running and accessible

### Advanced Features

#### PIN Security
- **Open settings**: Tap the clock display 5 times (within 3 seconds)
- **Change PIN**: Go to settings → Security → Change PIN
- **Default PIN**: 1234 (change this for security)
- **Access Control**: PIN protects configuration changes from children; the hidden entry gesture keeps the UI distraction-free

#### Client Management
- **Multiple Profiles**: Create separate profiles for different family members
- **Individual Libraries**: Each client has its own music collection
- **Speaker Assignment**: Assign different Sonos speakers to different profiles

#### Performance Optimization
- **Caching**: Music data is cached for 24 hours for faster loading
- **Background Loading**: Categories load in the background for instant switching
- **Smart Retry**: Failed requests are automatically retried with proper delays

### Configuration Files

#### Main Config (`server/config/config.json`)
```json
{
    "node-sonos-http-api": {
        "server": "192.168.1.100",
        "port": "5005"
    },
    "spotify": {
        "clientId": "your_spotify_client_id",
        "clientSecret": "your_spotify_client_secret"
    },
    "clients": {
        "client-abc123": {
            "name": "Kids Room",
            "room": "Living Room"
        }
    }
}
```

**Note**: TuneIn Radio works out of the box without any API configuration required.

#### SQLite Database (`database.sqlite`)
- Contains all music library data for all clients
- Automatically created and managed by the application
- Can be manually edited (backup first!)

### Support and Maintenance

#### Regular Maintenance
1. **Update Dependencies**: Run `npm update` periodically
2. **Clear Cache**: Delete cache files if experiencing issues
3. **Backup Data**: Backup your `server/config/` directory regularly

#### Getting Help
1. **Check Logs**: Look at browser console for error messages
2. **Verify Setup**: Ensure all prerequisites are properly installed
3. **Network Issues**: Check connectivity between devices and Sonos speakers

#### Version Updates
1. **Backup First**: Always backup your configuration before updating
2. **Follow Instructions**: Check release notes for specific update procedures
3. **Test Thoroughly**: Verify all functionality after updates

---

## Technical Documentation

### API Endpoints
- `GET /api/data?clientId=xxx` - Get client library data
- `POST /api/add` - Add new media item
- `GET /api/token` - Get Spotify access token
- `GET /api/config?clientId=xxx` - Get client configuration
- `POST /api/config/client` - Update client settings

### Architecture
- **Frontend**: Angular 18 + Ionic 8
- **Backend**: Node.js + Express
- **Storage**: JSON files for configuration and data
- **Caching**: In-memory with 24-hour expiration
- **Authentication**: PIN-based configuration access

### Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

---

*For technical support or feature requests, please refer to the project repository.*