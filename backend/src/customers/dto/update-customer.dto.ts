import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
