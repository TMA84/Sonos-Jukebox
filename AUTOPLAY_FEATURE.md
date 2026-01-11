# Artist Autoplay Feature

## Overview

The autoplay feature automatically plays the next album, track, or show from the same artist when the current one ends.

## How It Works

### 1. AutoplayService (`src/app/autoplay.service.ts`)

- Manages the autoplay queue for the current artist
- Fetches all albums/episodes/shows for an artist from Spotify
- Tracks the current position in the queue
- Provides the next item when current playback ends
- Stores autoplay preference in localStorage

### 2. Player Integration (`src/app/player/player.page.ts`)

- Monitors playback status every 2 seconds
- Detects when a track/album/show ends by checking track URI changes
- Automatically plays the next item from the queue
- Displays autoplay toggle button in the UI

### 3. Server API (`server.js`)

- Added `/api/spotify/shows/:id/episodes` endpoint to fetch podcast/show episodes
- Supports pagination for large episode lists

## Features

### Autoplay Toggle

- Button in the player UI to enable/disable autoplay
- Preference is saved to localStorage
- Visual indicator shows current state (On/Off)

### Queue Building

- Automatically builds queue when media starts playing
- Fetches all content from the same artist:
  - **Music**: All albums from the artist
  - **Podcasts/Shows**: All episodes
  - **Audiobooks**: The audiobook itself
- Handles pagination for large catalogs

### Smart Detection

- Monitors track URI changes to detect when playback ends
- Prevents duplicate autoplay triggers
- Handles edge cases (last item, artist with single album, etc.)

## Usage

1. **Play any album, track, or show** from an artist
2. **Autoplay is enabled by default** - the next item will play automatically when the current one ends
3. **Toggle autoplay** using the button in the player UI
4. **Queue is built automatically** - no manual intervention needed

## Technical Details

### Queue Management

- Queue is built on first play and cached for the session
- Resets when switching to a different artist
- Tracks current position in the queue

### Playback Detection

- Polls player status every 2 seconds
- Compares track URIs to detect changes
- Waits 1 second after detection before triggering next play

### API Integration

- Uses Spotify Web API for fetching artist content
- Supports pagination (50 items per request)
- Handles rate limiting and errors gracefully

## Files Modified

1. **src/app/autoplay.service.ts** (new) - Core autoplay logic
2. **src/app/player/player.page.ts** - Player integration
3. **src/app/player/player.page.html** - Autoplay toggle UI
4. **src/app/player/player.page.scss** - Autoplay button styling
5. **server.js** - Added show episodes endpoint

## Future Enhancements

- Shuffle mode for autoplay queue
- Repeat mode (repeat artist's content)
- Queue visualization
- Manual queue editing
- Cross-artist autoplay based on genre/mood
