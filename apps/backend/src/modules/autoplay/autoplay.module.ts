import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../../database/entities/client.entity';
import { MediaItemEntity } from '../../database/entities/media-item.entity';
import { AutoplayService } from './autoplay.service';
import { AutoplayController } from './autoplay.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, MediaItemEntity])],
  providers: [AutoplayService],
  controllers: [AutoplayController],
  exports: [AutoplayService],
})
export class AutoplayModule {}
