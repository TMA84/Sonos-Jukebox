import { Router, Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';
import http from 'http';

export const sonosRouter = Router();
const configService = new ConfigService();

/**
 * @swagger
 * /api/sonos/zones:
 *   get:
 *     summary: Get Sonos zones/speakers
 *     tags: [Sonos]
 */
sonosRouter.get('/zones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { host, port } = await configService.getSonosConfig();
    const url = `http://${host}:${port}/zones`;

    http.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          res.json(JSON.parse(data));
        } catch {
          res.status(500).json({ error: 'Failed to parse Sonos response' });
        }
      });
    }).on('error', () => {
      res.status(500).json({ error: 'Failed to connect to Sonos API' });
    });
  } catch (error) {
    next(error);
  }
});
