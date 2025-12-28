import { Router, Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';
import { authenticateToken } from '../middleware/auth';

export const configRouter = Router();
const configService = new ConfigService();

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get all configuration
 *     tags: [Config]
 */
configRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await configService.getAll();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/config/sonos:
 *   get:
 *     summary: Get Sonos configuration
 *     tags: [Config]
 */
configRouter.get('/sonos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await configService.getSonosConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/config/sonos:
 *   post:
 *     summary: Update Sonos configuration
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 */
configRouter.post('/sonos', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { host, port } = req.body;
    await configService.setSonosConfig(host, port);
    res.json({ message: 'Sonos configuration updated' });
  } catch (error) {
    next(error);
  }
});
