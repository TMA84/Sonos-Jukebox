import { Router, Request, Response, NextFunction } from 'express';
import { ClientService } from '../services/client.service';
import { optionalAuth, AuthRequest } from '../middleware/auth';

export const clientRouter = Router();
const clientService = new ClientService();

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Get all clients
 *     tags: [Clients]
 */
clientRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await clientService.getAllClients();
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
 */
clientRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientService.getClient(req.params.id);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create new client
 *     tags: [Clients]
 */
clientRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name } = req.body;
    const client = await clientService.createClient(id, name);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update client
 *     tags: [Clients]
 */
clientRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Delete client
 *     tags: [Clients]
 */
clientRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await clientService.deleteClient(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/clients/{id}/speaker:
 *   post:
 *     summary: Update client speaker
 *     tags: [Clients]
 */
clientRouter.post('/:id/speaker', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { room } = req.body;
    const client = await clientService.updateSpeaker(req.params.id, room);
    res.json(client);
  } catch (error) {
    next(error);
  }
});
