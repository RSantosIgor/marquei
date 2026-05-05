import { IsString, Matches } from 'class-validator';

export class QueryAvailabilityDto {
  @IsString()
  professionalId: string;

  @IsString()
  serviceId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;
}
