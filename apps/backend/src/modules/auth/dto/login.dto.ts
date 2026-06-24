import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(4, 20)
  pin!: string;
}
