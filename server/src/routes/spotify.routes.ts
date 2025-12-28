import { Router, Request, Response, NextFunction } from 'express';
import { SpotifyService } from '../services/spotify.service';
import { AppError } from '../middleware/error-handler';

export const spotifyRouter = Router();
const spotifyService = new SpotifyService();

/**
 * @swagger
 * /api/spotify/search/albums:
 *   get:
 *     summary: Search for albums on Spotify
 *     tags: [Spotify]
 */
spotifyRouter.get('/search/albums', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!spotifyService.isConfigured()) {
      throw new AppError(503, 'Spotify is not configured');
    }

    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const albums = await spotifyService.searchAlbums(query, limit, offset);
    res.json(albums);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/spotify/search/artists:
 *   get:
 *     summary: Search for artists on Spotify
 *     tags: [Spotify]
 */
spotifyRouter.get('/search/artists', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!spotifyService.isConfigured()) {
      throw new AppError(503, 'Spotify is not configured');
    }

    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const artists = await spotifyService.searchArtists(query, limit, offset);
    res.json(artists);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/spotify/artists/{id}/albums:
 *   get:
 *     summary: Get albums for an artist
 *     tags: [Spotify]
 */
spotifyRouter.get('/artists/:id/albums', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!spotifyService.isConfigured()) {
      throw new AppError(503, 'Spotify is not configured');
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const albums = await spotifyService.getArtistAlbums(req.params.id, limit, offset);
    res.json(albums);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/spotify/albums/{id}:
 *   get:
 *     summary: Get album details
 *     tags: [Spotify]
 */
spotifyRouter.get('/albums/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!spotifyService.isConfigured()) {
      throw new AppError(503, 'Spotify is not configured');
    }

    const album = await spotifyService.getAlbum(req.params.id);
    res.json(album);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/spotify/status:
 *   get:
 *     summary: Check if Spotify is configured
 *     tags: [Spotify]
 */
spotifyRouter.get('/status', (req: Request, res: Response) => {
  res.json({ configured: spotifyService.isConfigured() });
});
