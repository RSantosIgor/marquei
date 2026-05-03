import { IsDateString } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  startTime: string;
}
