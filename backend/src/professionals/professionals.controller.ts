import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators';
import { ProfessionalsService } from './professionals.service';
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
  QueryProfessionalDto,
  SetScheduleDto,
  LinkServicesDto,
} from './dto';

@Controller('professionals')
@Roles(Role.MANAGER)
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  async create(@Body() dto: CreateProfessionalDto) {
    const data = await this.professionalsService.create(dto);
    return { data };
  }

  @Get()
  async findAll(@Query() query: QueryProfessionalDto) {
    return this.professionalsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.professionalsService.findOne(id);
    return { data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessionalDto) {
    const data = await this.professionalsService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.professionalsService.remove(id);
    return { data };
  }

  @Put(':id/schedule')
  async setSchedule(@Param('id') id: string, @Body() dto: SetScheduleDto) {
    const data = await this.professionalsService.setSchedule(id, dto);
    return { data };
  }

  @Put(':id/services')
  async linkServices(@Param('id') id: string, @Body() dto: LinkServicesDto) {
    const data = await this.professionalsService.linkServices(id, dto);
    return { data };
  }
}
