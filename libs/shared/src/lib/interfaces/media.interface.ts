import { MediaCategory } from '../enums/media-category.enum';
import { MediaSourceType } from '../enums/media-source-type.enum';
import { ContentType } from '../enums/content-type.enum';

export interface MediaItem {
  id: string;
  clientId: string;
  title: string;
  artist: string;
  cover: string | null;
  type: MediaSourceType | null;
  category: MediaCategory;
  contentType: ContentType | null;
  spotifyUri: string | null;
  spotifyId: string | null;
  artistId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
