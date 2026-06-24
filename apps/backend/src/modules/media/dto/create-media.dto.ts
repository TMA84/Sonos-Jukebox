import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateMediaDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  clientId!: string;

  @IsString()
  title!: string;

  @IsString()
  artist!: string;

  @IsOptional()
  @IsString()
  cover?: string | null;

  @IsOptional()
  @IsString()
  type?: string | null;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  contentType?: string | null;

  @IsOptional()
  @IsString()
  spotifyUri?: string | null;

  @IsOptional()
  @IsString()
  spotifyId?: string | null;

  @IsOptional()
  @IsString()
  artistId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  cover?: string | null;

  @IsOptional()
  @IsString()
  type?: string | null;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  contentType?: string | null;

  @IsOptional()
  @IsString()
  spotifyUri?: string | null;

  @IsOptional()
  @IsString()
  spotifyId?: string | null;

  @IsOptional()
  @IsString()
  artistId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
