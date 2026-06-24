import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto.pin);
  }

  @Get('verify')
  verify(@Headers('authorization') auth: string): Promise<{ valid: boolean }> {
    const token = auth?.replace('Bearer ', '') ?? '';
    return this.authService.verifyToken(token);
  }

  @Post('pin/change')
  changePin(@Body() body: { currentPin: string; newPin: string }): Promise<void> {
    return this.authService.changePin(body.currentPin, body.newPin);
  }
}
