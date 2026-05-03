import { IsArray, IsString } from 'class-validator';

export class LinkServicesDto {
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];
}
