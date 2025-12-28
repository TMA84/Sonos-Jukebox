import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/user.entity';
import { Config } from '../database/entities/config.entity';
import { AppError } from '../middleware/error-handler';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private configRepository = AppDataSource.getRepository(Config);

  async verifyPin(pin: string): Promise<boolean> {
    const config = await this.configRepository.findOne({ where: { key: 'pin' } });
    const storedPin = config?.value || '1234';
    return pin === storedPin;
  }

  async changePin(currentPin: string, newPin: string): Promise<void> {
    const isValid = await this.verifyPin(currentPin);
    if (!isValid) {
      throw new AppError(401, 'Current PIN is incorrect');
    }

    await this.configRepository.save({
      key: 'pin',
      value: newPin,
      description: 'PIN for configuration access',
    });
  }

  async createUser(username: string, password: string, isAdmin = false): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { username } });
    if (existingUser) {
      throw new AppError(400, 'Username already exists');
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const passwordHash = await bcrypt.hash(password, rounds);

    const user = this.userRepository.create({
      username,
      passwordHash,
      isAdmin,
    });

    return await this.userRepository.save(user);
  }

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    return user;
  }

  generateToken(userId: string, clientId: string): string {
    const secret = process.env.JWT_SECRET || 'change-this-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    return jwt.sign({ userId, clientId }, secret, { expiresIn });
  }

  async authenticateWithPin(pin: string, clientId: string): Promise<string> {
    const isValid = await this.verifyPin(pin);
    if (!isValid) {
      throw new AppError(401, 'Invalid PIN');
    }

    // Generate token for PIN-based auth
    return this.generateToken('pin-user', clientId);
  }
}
