import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MigrationService, MigrationResult } from './migration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/migrate')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  migrate(@Body() body: { v2DbPath: string }): Promise<MigrationResult> {
    return this.migrationService.migrate(body.v2DbPath);
  }
}
