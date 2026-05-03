import { IsString, IsInt, IsNumber, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(5)
  @Type(() => Number)
  duration: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;
}
