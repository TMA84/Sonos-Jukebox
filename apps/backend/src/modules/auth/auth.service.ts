import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { UserEntity } from '../../database/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAdminUser();
  }

  private async ensureAdminUser(): Promise<void> {
    const count = await this.userRepo.count();
    if (count === 0) {
      const defaultPin = this.config.get<string>('admin.pin', '1234');
      await this.userRepo.save({
        username: 'admin',
        pin: this.hashPin(defaultPin),
        isActive: true,
      });
      this.logger.log('Default admin user created');
    }
  }

  async login(pin: string): Promise<{ access_token: string }> {
    const hashed = this.hashPin(pin);
    const user = await this.userRepo.findOne({ where: { username: 'admin', isActive: true } });

    if (!user || user.pin !== hashed) {
      throw new UnauthorizedException('Invalid PIN');
    }

    const payload = { sub: user.username };
    return { access_token: this.jwtService.sign(payload) };
  }

  async verifyToken(token: string): Promise<{ valid: boolean }> {
    try {
      this.jwtService.verify(token);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }

  async changePin(currentPin: string, newPin: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { username: 'admin' } });
    if (!user || user.pin !== this.hashPin(currentPin)) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }
    user.pin = this.hashPin(newPin);
    await this.userRepo.save(user);
  }

  private hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex');
  }
}
