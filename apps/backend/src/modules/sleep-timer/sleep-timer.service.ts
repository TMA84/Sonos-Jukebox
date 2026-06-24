import { Injectable, Logger } from '@nestjs/common';
import { SonosService } from '../sonos/sonos.service';

interface TimerEntry {
  endsAt: Date;
  intervalId: NodeJS.Timeout;
}

export interface SleepTimerState {
  active: boolean;
  remainingSeconds: number | null;
  clientId: string;
}

@Injectable()
export class SleepTimerService {
  private readonly logger = new Logger(SleepTimerService.name);
  private readonly timers = new Map<string, TimerEntry>();

  constructor(private readonly sonosService: SonosService) {}

  getState(clientId: string): SleepTimerState {
    const entry = this.timers.get(clientId);
    if (!entry) {
      return { active: false, remainingSeconds: null, clientId };
    }

    const remainingMs = entry.endsAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      this.timers.delete(clientId);
      return { active: false, remainingSeconds: null, clientId };
    }

    return {
      active: true,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      clientId,
    };
  }

  start(clientId: string, minutes: number, room: string): SleepTimerState {
    this.clearTimer(clientId);

    const endsAt = new Date(Date.now() + minutes * 60 * 1000);
    const intervalId = setTimeout(async () => {
      this.timers.delete(clientId);
      this.logger.log(`Sleep timer expired for client "${clientId}", pausing room "${room}"`);
      await this.sonosService.pause(room);
    }, minutes * 60 * 1000);

    this.timers.set(clientId, { endsAt, intervalId });
    this.logger.log(`Started sleep timer for client "${clientId}": ${minutes} minutes in room "${room}"`);

    return this.getState(clientId);
  }

  stop(clientId: string): void {
    this.clearTimer(clientId);
    this.logger.log(`Stopped sleep timer for client "${clientId}"`);
  }

  private clearTimer(clientId: string): void {
    const existing = this.timers.get(clientId);
    if (existing) {
      clearTimeout(existing.intervalId);
      this.timers.delete(clientId);
    }
  }
}
