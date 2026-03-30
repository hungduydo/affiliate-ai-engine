import { IsOptional, IsString } from 'class-validator';

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
