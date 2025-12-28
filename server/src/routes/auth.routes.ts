import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticateToken } from '../middleware/auth';

export const authRouter = Router();
const authService = new AuthService();

/**
 * @swagger
 * /api/auth/pin/verify:
 *   post:
 *     summary: Verify PIN and get access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pin:
 *                 type: string
 *               clientId:
 *                 type: string
 *     responses:
 *       200:
 *         description: PIN verified successfully
 */
authRouter.post('/pin/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, clientId } = req.body;
    const token = await authService.authenticateWithPin(pin, clientId);
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/pin/change:
 *   post:
 *     summary: Change PIN
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
authRouter.post('/pin/change', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPin, newPin } = req.body;
    await authService.changePin(currentPin, newPin);
    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/pin:
 *   get:
 *     summary: Get current PIN (for backward compatibility)
 *     tags: [Auth]
 */
authRouter.get('/pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This endpoint is kept for backward compatibility but should be removed in production
    const pin = await authService.verifyPin('1234') ? '1234' : 'custom';
    res.send(pin);
  } catch (error) {
    next(error);
  }
});
