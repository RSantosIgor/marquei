import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateProfessionalDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
