import { Router } from 'express';
import { authRouter } from './auth.routes';
import { clientRouter } from './client.routes';
import { mediaRouter } from './media.routes';
import { configRouter } from './config.routes';
import { spotifyRouter } from './spotify.routes';
import { sonosRouter } from './sonos.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/clients', clientRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/spotify', spotifyRouter);
apiRouter.use('/sonos', sonosRouter);
