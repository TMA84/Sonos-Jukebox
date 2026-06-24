import { Controller, Get, Put, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AppConfigService, AppConfigStatus } from './app-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  getStatus(): AppConfigStatus {
    return this.appConfigService.getStatus();
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  updateConfig(): void {
    // Credentials are configured via environment variables (.env)
  }
}
