export interface Media {
  id: string;
  clientId: string;
  type: string;
  category: string;
  title: string;
  artist?: string;
  cover?: string;
  spotifyUri?: string;
  spotifyId?: string;
  metadata?: Record<string, any>;
  playCount: number;
  lastPlayedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artist {
  name: string;
  albumCount: string;
  cover: string;
  coverMedia: Media;
}
