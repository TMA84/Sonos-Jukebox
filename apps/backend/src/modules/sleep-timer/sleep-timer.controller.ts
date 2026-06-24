import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SleepTimerService, SleepTimerState } from './sleep-timer.service';

@Controller('api/sleep-timer')
export class SleepTimerController {
  constructor(private readonly sleepTimerService: SleepTimerService) {}

  @Get(':clientId')
  getState(@Param('clientId') clientId: string): SleepTimerState {
    return this.sleepTimerService.getState(clientId);
  }

  @Post(':clientId/start')
  start(
    @Param('clientId') clientId: string,
    @Body() body: { minutes: number; room: string },
  ): SleepTimerState {
    return this.sleepTimerService.start(clientId, body.minutes, body.room);
  }

  @Post(':clientId/stop')
  @HttpCode(HttpStatus.NO_CONTENT)
  stop(@Param('clientId') clientId: string): void {
    return this.sleepTimerService.stop(clientId);
  }
}
