import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  version: string;
  spotify: boolean;
  sonos: boolean;
  database: boolean;
}

@Controller()
export class HealthController {
  @Get('health')
  check(): HealthResponse {
    return {
      status: 'ok',
      version: '3.0.0',
      spotify: !!process.env['SPOTIFY_CLIENT_ID'],
      sonos: !!process.env['SONOS_HOST'],
      database: true,
    };
  }
}
