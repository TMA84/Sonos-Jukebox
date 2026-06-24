import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  Min,
  Max,
} from 'class-validator';

export class CreateAlarmDto {
  @IsString()
  clientId!: string;

  @IsString()
  name!: string;

  @IsString()
  time!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  days!: number[];

  @IsOptional()
  @IsString()
  mediaId?: string | null;

  @IsOptional()
  @IsString()
  mediaTitle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  volume?: number = 50;

  @IsOptional()
  @IsBoolean()
  fadeIn?: boolean = false;

  @IsOptional()
  @IsInt()
  fadeDuration?: number = 30;
}

export class UpdateAlarmDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  days?: number[];

  @IsOptional()
  @IsString()
  mediaId?: string | null;

  @IsOptional()
  @IsString()
  mediaTitle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  volume?: number;

  @IsOptional()
  @IsBoolean()
  fadeIn?: boolean;

  @IsOptional()
  @IsInt()
  fadeDuration?: number;
}
