import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  QueryAvailabilityDto,
  QueryAppointmentDto,
  QueryManagerAppointmentsDto,
  QueryProfessionalScheduleDto,
  UpdateStatusDto,
  QueryHistoryDto,
} from './dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ─── Client booking endpoints ──────────────────────

  @Get('services')
  @Roles(Role.CLIENT)
  async getAvailableServices() {
    return this.appointmentsService.getAvailableServices();
  }

  @Get('professionals')
  @Roles(Role.CLIENT)
  async getProfessionalsForService(
    @Query('serviceId') serviceId: string,
  ) {
    return this.appointmentsService.getProfessionalsForService(serviceId);
  }

  @Get('availability')
  @Roles(Role.CLIENT)
  async getAvailability(@Query() query: QueryAvailabilityDto) {
    return this.appointmentsService.getAvailability(query);
  }

  @Post()
  @Roles(Role.CLIENT)
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    const data = await this.appointmentsService.create(userId, dto);
    return { data };
  }

  @Get('mine')
  @Roles(Role.CLIENT)
  async findMyAppointments(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryAppointmentDto,
  ) {
    return this.appointmentsService.findMyAppointments(userId, query);
  }

  @Patch(':id/reschedule')
  @Roles(Role.CLIENT)
  async reschedule(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    const data = await this.appointmentsService.reschedule(userId, id, dto);
    return { data };
  }

  @Patch(':id/cancel')
  @Roles(Role.CLIENT)
  async cancel(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.appointmentsService.cancel(userId, id);
    return { data };
  }

  // ─── Manager endpoints ────────────────────────────

  @Get('all')
  @Roles(Role.MANAGER)
  async findAll(@Query() query: QueryManagerAppointmentsDto) {
    return this.appointmentsService.findAll(query);
  }

  @Get('history')
  @Roles(Role.MANAGER)
  async getHistory(@Query() query: QueryHistoryDto) {
    return this.appointmentsService.getHistory(query);
  }

  // ─── Professional endpoints ───────────────────────

  @Get('my-schedule')
  @Roles(Role.PROFESSIONAL)
  async findProfessionalSchedule(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryProfessionalScheduleDto,
  ) {
    return this.appointmentsService.findProfessionalSchedule(
      userId,
      query.date,
    );
  }

  // ─── Status update (professional + manager) ───────

  @Patch(':id/status')
  @Roles(Role.PROFESSIONAL, Role.MANAGER)
  async updateStatus(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const data = await this.appointmentsService.updateStatus(
      userId,
      role,
      id,
      dto,
    );
    return { data };
  }
}
