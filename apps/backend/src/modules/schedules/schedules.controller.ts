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
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleEntity } from '../../database/entities/schedule.entity';

@Controller('api/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  findByClient(@Query('clientId') clientId: string): Promise<ScheduleEntity[]> {
    return this.schedulesService.findByClient(clientId);
  }

  @Get('blocked')
  getBlockedCategories(@Query('clientId') clientId: string): Promise<string[]> {
    return this.schedulesService.getBlockedCategories(clientId);
  }

  @Post()
  create(@Body() dto: CreateScheduleDto): Promise<ScheduleEntity> {
    return this.schedulesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto): Promise<ScheduleEntity> {
    return this.schedulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.schedulesService.remove(id);
  }
}
