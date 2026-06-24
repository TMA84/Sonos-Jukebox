import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto } from './dto/create-media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaItemEntity } from '../../database/entities/media-item.entity';

@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findByClient(
    @Query('clientId') clientId: string,
    @Query('category') category?: string,
  ): Promise<MediaItemEntity[]> {
    return this.mediaService.findByClient(clientId, category);
  }

  @Post()
  create(@Body() dto: CreateMediaDto): Promise<MediaItemEntity> {
    return this.mediaService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Query('clientId') clientId: string,
    @Body() dto: UpdateMediaDto,
  ): Promise<MediaItemEntity> {
    return this.mediaService.update(id, clientId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Query('clientId') clientId: string): Promise<void> {
    return this.mediaService.remove(id, clientId);
  }
}
