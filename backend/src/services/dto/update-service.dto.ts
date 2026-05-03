import { IsString, IsInt, IsNumber, IsBoolean, IsOptional, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(5)
  @Type(() => Number)
  @IsOptional()
  duration?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
