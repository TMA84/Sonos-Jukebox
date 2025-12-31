# Sonos Kids Controller - Enhanced Edition

*This enhanced version builds upon the original work by [Thyraz](https://github.com/Thyraz/Sonos-Kids-Controller) with significant performance improvements, new features, and bug fixes.*

## What's New in Version 2.2.1

### 🔄 Migration & Upgrade Features
- **Automatic migration from JSON to SQLite** - Seamless upgrade path for existing users
- **Legacy data preservation** - All library items, clients, and settings automatically migrated
- **Zero-downtime upgrades** - Migration happens during normal server startup
- **Safe migration process** - Uses INSERT OR REPLACE to prevent data duplication
- **Comprehensive migration support** - Handles config.json, pin.json, and all client data files

### 🛡️ Backward Compatibility
- **Automatic detection** of legacy JSON configuration files
- **Graceful error handling** for malformed or missing legacy files
- **Migration logging** for debugging and verification
- **Home Assistant addon support** - Seamless upgrade for HA users

## What's New in Version 2.2.0

### 🎧 Complete Audiobook Support
- **Spotify audiobook integration** - Search, add, and play audiobooks directly from Spotify
- **Chapter-based playback** - Audiobooks are treated like podcasts with individual chapters
- **Unified search interface** - Combined search for Albums, Artists, Podcasts, and Audiobooks
- **Automatic chapter fetching** - First chapter plays automatically with proper Sonos compatibility

### 📻 TuneIn Radio Integration
- **Live radio station search** - Find stations by name, genre, or location
- **Real-time search results** - Instant station discovery as you type
- **Sonos-compatible playback** - Direct radio streaming through your Sonos speakers
- **Default radio icons** - Consistent visual experience for all radio stations
- **No configuration required** - Works out of the box without API keys

### ✏️ Library Management
- **Edit existing items** - Modify artist, title, category, and source of saved content
- **In-place editing** - Edit directly from the library list in config page
- **Dynamic form handling** - Same interface for adding new items and editing existing ones
- **Cancel functionality** - Easy way to abort edits and return to normal mode

### 🗄️ Modern Database Architecture
- **SQLite database** - Migrated from JSON files to robust SQLite storage
- **Single server file** - Simplified architecture with server.js handling everything
- **Improved performance** - Faster data access and better concurrent user support
- **Data integrity** - ACID compliance and better error handling

### 🎵 Enhanced Content Support
- **Podcast episodes** - View and play individual podcast episodes instead of just show info
- **Multiple content types** - Support for albums, tracks, episodes, audiobooks, and radio
- **Smart URI handling** - Automatic detection and proper formatting for different media types
- **Improved search** - Content-type specific search with better results

### 🔧 Technical Improvements
- **Repository cleanup** - Removed 4,900+ lines of obsolete code and files
- **Streamlined deployment** - Single `npm start` command runs the complete application
- **Better error handling** - More informative error messages and graceful failures
- **API consistency** - Unified endpoints for all media operations

## What's New in Version 2.1.7

### 🎨 Modern Search Experience
- **Redesigned search components** - Album, artist, and service search now use modern card-based layouts
- **Enhanced visual hierarchy** - Improved typography, spacing, and hover effects across all search interfaces
- **Consistent styling** - All search modals now match the config page's modern design system
- **Better user feedback** - Smooth transitions and modern loading states

### 🔧 API Integration & Configuration
- **Amazon Music API** - Added search endpoint with mock implementation ready for integration
- **Apple Music API** - Added search endpoint with mock implementation ready for integration  
- **TuneIn Radio API** - Added search endpoint with mock implementation ready for integration
- **Smart source management** - Library sources are automatically disabled when API credentials are missing
- **Visual feedback** - Disabled sources show clear visual indicators and prevent user errors

### 🖱️ Enhanced Dropdown Experience
- **Modern dropdown styling** - All select menus now feature backdrop blur, shadows, and smooth animations
- **Consistent popover design** - Unified look across client selectors and service dropdowns
- **Improved accessibility** - Better hover states and selection feedback

### 🎵 Player Interface Improvements
- **Reorganized layout** - "Now Playing" information moved directly under player controls for better flow
- **Cleaner interface** - More logical grouping of player elements

### ⚙️ Configuration Management
- **Streamlined client selection** - Client dropdown moved to header for easier access
- **Context-aware display** - Shows client selector on relevant tabs, client name on global settings
- **Consistent spacing** - Proper layout spacing maintained across all configuration tabs

### 🛠️ Build & Performance Optimizations
- **Resolved build warnings** - Updated TypeScript target to ES2022
- **Optimized dependencies** - Properly configured CommonJS dependencies
- **Cleaner compilation** - Excluded unused files from TypeScript compilation
- **Updated Angular configuration** - Removed deprecated settings

## What's New in Version 2.1.6

### 🎨 Modern Design & UX Overhaul
- **iPad-styled virtual keyboard** - German QWERTZ layout with ü, ö, ä, ß support across all pages
- **Modern design system** - Comprehensive styling with backdrop blur, shadows, and animations
- **Enhanced speaker management** - Client-specific default speakers with temporary session changes
- **Centralized client names** - Server-side storage with consistent display across all pages
- **Improved search experience** - Modern keyboard in album and artist search components

## What's New in Version 2.1.5

### 🔧 Cache Management Fix
- **Fixed library updates** - Home page now immediately shows newly added albums and artists
- **Cache clearing** - Automatic cache invalidation when adding or deleting library content
- **Data consistency** - Ensures fresh data loading after library modifications
- **Improved user experience** - No more need to refresh page after adding content

## What's New in Version 2.1.4

### 🔧 Bug Fixes & Stability
- **Fixed infinite scrolling** - Resolved visibility conditions for proper album loading in medialist page
- **Improved loading states** - Albums grid now remains visible during loading for better user experience
- **Enhanced error handling** - Better handling of simultaneous requests with proper disabled states
- **Optimized pagination** - Prevents multiple API calls during scroll loading

## What's New in Version 2.1.3

### 🚀 Performance & UX Improvements
- **Infinite scrolling** - Smooth browsing through large artist and album collections
- **Optimized Spotify rate limiting** - Prevents API rate limits with smart loading strategies
- **On-demand album loading** - Albums load only when artists are selected, reducing startup time
- **Enhanced pagination** - Better handling of large content libraries with progressive loading

## What's New in Version 2.1.2

### 🎯 Enhanced User Experience
- **Direct artist loading** - Shows artists immediately on app start for all content categories
- **Improved navigation** - Faster access to content with optimized loading flow
- **Better performance** - Streamlined data loading for quicker app startup

## What's New in Version 2.1.1

### 🧹 Code Quality Improvements
- **Clean console output** - Removed verbose debug logging for cleaner browser console
- **Optimized logging** - Kept essential error logging while removing development noise
- **Better user experience** - Cleaner debugging environment for production use

## What's New in Version 2.1.0

### 🚀 Performance Enhancements
- **24-hour caching** with background preloading for instant category switching
- **Fixed stream processing** that handles empty results gracefully
- **Improved Spotify rate limiting** using Retry-After headers
- **Cross-browser compatibility** with server-side data storage

### 🎯 Multi-Client Support
- **Client management** - Create and manage multiple user profiles
- **Cookie-based persistence** - Reliable client switching across browsers
- **URL client loading** - Direct access via `?client=name` parameter
- **Per-client configurations** - Individual speaker and library settings

### 🔧 Enhanced User Experience
- **Automatic speaker loading** from client configuration
- **Improved error handling** for failed artist loading
- **Better token refresh** mechanism for uninterrupted playback
- **Robust data loading** that works consistently across all browsers

### 🛠️ Technical Improvements
- **Modern Angular 18** and Ionic 8 framework
- **115+ security vulnerabilities** fixed (reduced to 11 low-risk)
- **Optimized build process** with better dependency management
- **Enhanced API endpoints** for client and configuration management

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
2. Click the settings button (⚙️) and enter PIN (default: 1234)
3. Configure your Sonos speakers and Spotify credentials (TuneIn Radio works automatically)
4. Create your first client profile
5. Add music content using the search functionality

## Customer Handbook

### Getting Started

#### Creating Your First Profile
1. **Access Settings**: Click the gear icon (⚙️) in the top-right corner
2. **Enter PIN**: Use the default PIN `1234` (you can change this later)
3. **Create Client**: Click "Create New Client" and give it a name (e.g., "Kids Room")
4. **Select Speaker**: Choose which Sonos speaker this profile should use

#### Adding Music Content

##### Unified Search Interface (New in 2.2.0)
1. **Access Config**: Click the settings button (⚙️) and enter PIN
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

##### Edit Existing Content (New in 2.2.0)
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
- **Change PIN**: Go to settings → Security → Change PIN
- **Default PIN**: 1234 (change this for security)
- **Access Control**: PIN protects configuration changes from children

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