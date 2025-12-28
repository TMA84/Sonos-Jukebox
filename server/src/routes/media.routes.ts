import { Router, Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { optionalAuth, AuthRequest } from '../middleware/auth';

export const mediaRouter = Router();
const mediaService = new MediaService();

/**
 * @swagger
 * /api/media:
 *   get:
 *     summary: Get media items for a client
 *     tags: [Media]
 */
mediaRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.query.clientId as string || req.clientId || 'default';
    const category = req.query.category as string;
    const items = await mediaService.getMediaItems(clientId, category);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Get media item by ID
 *     tags: [Media]
 */
mediaRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await mediaService.getMediaItem(req.params.id);
    res.json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/media:
 *   post:
 *     summary: Create new media item
 *     tags: [Media]
 */
mediaRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await mediaService.createMediaItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete media item
 *     tags: [Media]
 */
mediaRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.query.clientId as string || 'default';
    await mediaService.deleteMediaItem(req.params.id, clientId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/media/{id}/play:
 *   post:
 *     summary: Increment play count
 *     tags: [Media]
 */
mediaRouter.post('/:id/play', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mediaService.incrementPlayCount(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/media/popular:
 *   get:
 *     summary: Get popular media items
 *     tags: [Media]
 */
mediaRouter.get('/popular/:clientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const items = await mediaService.getPopularItems(req.params.clientId, limit);
    res.json(items);
  } catch (error) {
    next(error);
  }
});
