import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import { CreateAlarmDto, UpdateAlarmDto } from './dto/create-alarm.dto';
import { AlarmEntity } from '../../database/entities/alarm.entity';

@Controller('api/alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  findByClient(@Query('clientId') clientId: string): Promise<AlarmEntity[]> {
    return this.alarmsService.findByClient(clientId);
  }

  @Get('active')
  findActive(@Query('clientId') clientId: string): Promise<AlarmEntity | null> {
    return this.alarmsService.findActive(clientId);
  }

  @Post()
  create(@Body() dto: CreateAlarmDto): Promise<AlarmEntity> {
    return this.alarmsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlarmDto): Promise<AlarmEntity> {
    return this.alarmsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.alarmsService.remove(id);
  }

  @Post('stop')
  @HttpCode(HttpStatus.NO_CONTENT)
  stop(@Body() body: { clientId: string }): Promise<void> {
    return this.alarmsService.stop(body.clientId);
  }

  @Post('snooze')
  @HttpCode(HttpStatus.NO_CONTENT)
  snooze(@Body() body: { clientId: string; minutes: number }): Promise<void> {
    return this.alarmsService.snooze(body.clientId, body.minutes);
  }
}
