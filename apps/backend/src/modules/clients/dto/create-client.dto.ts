import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  room?: string | null;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  room?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClientSettingsDto {
  @IsOptional()
  @IsString()
  room?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  sleepTimer?: number;

  @IsOptional()
  @IsBoolean()
  enableSpeakerSelection?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAlarmClock?: boolean;

  @IsOptional()
  @IsBoolean()
  kioskMode?: boolean;

  @IsOptional()
  @IsBoolean()
  enableContentSearch?: boolean;

  @IsOptional()
  @IsBoolean()
  autoplayEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  repeatEnabled?: boolean;
}
