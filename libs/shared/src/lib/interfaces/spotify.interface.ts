export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artist: string;
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
  followers?: number;
}

export interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyAudiobook {
  id: string;
  name: string;
  authors: { name: string }[];
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  releaseDate: string;
}

export interface SpotifyChapter {
  id: string;
  name: string;
  uri: string;
  chapterNumber: number;
  durationMs: number;
}

export interface SpotifySearchResult {
  albums: SpotifyAlbum[];
  artists: SpotifyArtist[];
  shows: SpotifyShow[];
  audiobooks: SpotifyAudiobook[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  spotify: boolean;
  sonos: boolean;
  database: boolean;
}
