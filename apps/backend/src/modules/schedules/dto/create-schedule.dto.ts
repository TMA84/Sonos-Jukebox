import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsEnum } from 'class-validator';
import { MediaCategory } from '@sonos-jukebox/shared';

export class CreateScheduleDto {
  @IsString()
  clientId!: string;

  @IsEnum(MediaCategory)
  category!: MediaCategory;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsArray()
  @IsInt({ each: true })
  days!: number[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(MediaCategory)
  category?: MediaCategory;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  days?: number[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
