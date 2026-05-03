import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  QueryAvailabilityDto,
  QueryAppointmentDto,
  QueryManagerAppointmentsDto,
  QueryProfessionalScheduleDto,
  UpdateStatusDto,
} from './dto';

const MIN_CANCEL_HOURS = 24;

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getAvailableServices() {
    const services = await this.prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return { data: services };
  }

  async getProfessionalsForService(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const professionals = await this.prisma.professional.findMany({
      where: {
        active: true,
        user: { active: true },
        services: { some: { serviceId } },
      },
      include: {
        user: { select: { name: true } },
        workSchedules: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    return {
      data: professionals.map((p) => ({
        id: p.id,
        name: p.user.name,
        specialty: p.specialty,
        workSchedules: p.workSchedules.map((ws) => ({
          dayOfWeek: ws.dayOfWeek,
          startTime: ws.startTime,
          endTime: ws.endTime,
        })),
      })),
    };
  }

  async getAvailability(query: QueryAvailabilityDto) {
    const { professionalId, serviceId, date } = query;

    const [service, professional] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.professional.findUnique({
        where: { id: professionalId },
        include: { workSchedules: true },
      }),
    ]);

    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (!professional)
      throw new NotFoundException('Profissional não encontrado');

    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getUTCDay();

    const schedules = professional.workSchedules.filter(
      (ws) => ws.dayOfWeek === dayOfWeek,
    );

    if (schedules.length === 0) {
      return { data: { date, slots: [] } };
    }

    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
      },
    });

    const slots: string[] = [];
    const now = new Date();

    for (const schedule of schedules) {
      const startMinutes = this.timeToMinutes(schedule.startTime);
      const endMinutes = this.timeToMinutes(schedule.endTime);
      let current = startMinutes;

      while (current + service.duration <= endMinutes) {
        const slotStartDate = new Date(
          `${date}T${this.minutesToTime(current)}:00.000Z`,
        );
        const slotEndDate = new Date(
          slotStartDate.getTime() + service.duration * 60 * 1000,
        );

        if (slotStartDate <= now) {
          current += service.duration;
          continue;
        }

        const overlaps = appointments.some((apt) => {
          return slotStartDate < apt.endTime && slotEndDate > apt.startTime;
        });

        if (!overlaps) {
          slots.push(this.minutesToTime(current));
        }

        current += service.duration;
      }
    }

    return { data: { date, slots } };
  }

  async create(userId: string, dto: CreateAppointmentDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const [service, professional] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: dto.serviceId } }),
      this.prisma.professional.findUnique({
        where: { id: dto.professionalId },
      }),
    ]);

    if (!service || !service.active)
      throw new NotFoundException('Serviço não encontrado');
    if (!professional || !professional.active)
      throw new NotFoundException('Profissional não encontrado');

    const linkedService = await this.prisma.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
        },
      },
    });
    if (!linkedService) {
      throw new BadRequestException(
        'Este profissional não realiza o serviço selecionado',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    if (startTime <= new Date()) {
      throw new BadRequestException(
        'Não é possível agendar para uma data/hora passada',
      );
    }

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        // Serialize concurrent bookings for the same professional
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.professionalId}))`;

        const overlap = await tx.appointment.findFirst({
          where: {
            professionalId: dto.professionalId,
            status: { not: AppointmentStatus.CANCELLED },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (overlap) {
          throw new ConflictException('Horário já está ocupado');
        }

        return tx.appointment.create({
          data: {
            customerId: customer.id,
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
            startTime,
            endTime,
            notes: dto.notes,
          },
          include: {
            professional: { include: { user: { select: { name: true } } } },
            service: true,
          },
        });
      });

      const mapped = this.mapAppointment(appointment);

      // Dispatch confirmation notification (fire-and-forget)
      void this.notificationsService
        .dispatch(appointment.id, userId, NotificationType.CONFIRMATION)
        .catch(() => null);

      // Dispatch 24h reminder as delayed job
      const reminderDelay =
        appointment.startTime.getTime() - Date.now() - 24 * 60 * 60 * 1000;
      if (reminderDelay > 0) {
        void this.notificationsService
          .dispatch(
            appointment.id,
            userId,
            NotificationType.REMINDER_24H,
            reminderDelay,
          )
          .catch(() => null);
      }

      return mapped;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Exclusion constraint violation (safety net)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        (error as any)?.code === '23P01'
      ) {
        throw new ConflictException('Horário já está ocupado');
      }
      throw error;
    }
  }

  async findMyAppointments(userId: string, query: QueryAppointmentDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { customerId: customer.id },
        include: {
          professional: { include: { user: { select: { name: true } } } },
          service: true,
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where: { customerId: customer.id } }),
    ]);

    return {
      data: data.map((a) => this.mapAppointment(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reschedule(
    userId: string,
    id: string,
    dto: RescheduleAppointmentDto,
  ) {
    const appointment = await this.findOwnedAppointment(userId, id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Apenas agendamentos com status "Agendado" podem ser remarcados',
      );
    }

    const service = await this.prisma.service.findUnique({
      where: { id: appointment.serviceId },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');

    const newStart = new Date(dto.startTime);
    const newEnd = new Date(newStart.getTime() + service.duration * 60000);

    if (newStart <= new Date()) {
      throw new BadRequestException(
        'Não é possível remarcar para uma data/hora passada',
      );
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${appointment.professionalId}))`;

        const overlap = await tx.appointment.findFirst({
          where: {
            id: { not: id },
            professionalId: appointment.professionalId,
            status: { not: AppointmentStatus.CANCELLED },
            startTime: { lt: newEnd },
            endTime: { gt: newStart },
          },
        });

        if (overlap) {
          throw new ConflictException('Novo horário já está ocupado');
        }

        return tx.appointment.update({
          where: { id },
          data: { startTime: newStart, endTime: newEnd },
          include: {
            professional: { include: { user: { select: { name: true } } } },
            service: true,
          },
        });
      });

      const mapped = this.mapAppointment(updated);

      // Remove old reminder and dispatch reschedule + new reminder
      void this.notificationsService
        .removeDelayedJob(`${appointment.id}-${NotificationType.REMINDER_24H}`)
        .catch(() => null);

      void this.notificationsService
        .dispatch(updated.id, userId, NotificationType.RESCHEDULE)
        .catch(() => null);

      const newReminderDelay =
        newStart.getTime() - Date.now() - 24 * 60 * 60 * 1000;
      if (newReminderDelay > 0) {
        void this.notificationsService
          .dispatch(
            updated.id,
            userId,
            NotificationType.REMINDER_24H,
            newReminderDelay,
          )
          .catch(() => null);
      }

      return mapped;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        (error as any)?.code === '23P01'
      ) {
        throw new ConflictException('Novo horário já está ocupado');
      }
      throw error;
    }
  }

  async findAll(query: QueryManagerAppointmentsDto) {
    const { date, professionalId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {};
    if (professionalId) where.professionalId = professionalId;
    if (status) where.status = status;
    if (date) {
      where.startTime = {
        gte: new Date(date + 'T00:00:00.000Z'),
        lte: new Date(date + 'T23:59:59.999Z'),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          professional: { include: { user: { select: { name: true } } } },
          customer: { include: { user: { select: { name: true } } } },
          service: true,
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: data.map((a) => this.mapAppointment(a)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findProfessionalSchedule(userId: string, date: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { userId },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    const data = await this.prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        startTime: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z'),
        },
      },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        customer: { include: { user: { select: { name: true } } } },
        service: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return { data: data.map((a) => this.mapAppointment(a)) };
  }

  async updateStatus(userId: string, role: string, id: string, dto: UpdateStatusDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { professional: true },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Only owning professional or manager can update
    if (role === 'PROFESSIONAL') {
      if (appointment.professional.userId !== userId) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar este agendamento',
        );
      }
    }

    // Validate status transitions: SCHEDULED → COMPLETED/NO_SHOW/CANCELLED
    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Apenas agendamentos com status "Agendado" podem ter o status alterado',
      );
    }

    const allowedTargets: AppointmentStatus[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.CANCELLED,
    ];
    if (!allowedTargets.includes(dto.status)) {
      throw new BadRequestException(
        `Transição para "${dto.status}" não é permitida`,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        customer: { include: { user: { select: { name: true } } } },
        service: true,
      },
    });

    return this.mapAppointment(updated);
  }

  async cancel(userId: string, id: string) {
    const appointment = await this.findOwnedAppointment(userId, id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Apenas agendamentos com status "Agendado" podem ser cancelados',
      );
    }

    const hoursUntil =
      (appointment.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < MIN_CANCEL_HOURS) {
      throw new BadRequestException(
        `Cancelamento permitido apenas com ${MIN_CANCEL_HOURS}h de antecedência`,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        service: true,
      },
    });

    // Remove pending reminder and dispatch cancellation notification
    void this.notificationsService
      .removeDelayedJob(`${updated.id}-${NotificationType.REMINDER_24H}`)
      .catch(() => null);

    void this.notificationsService
      .dispatch(updated.id, userId, NotificationType.CANCELLATION)
      .catch(() => null);

    return this.mapAppointment(updated);
  }

  private async findOwnedAppointment(userId: string, appointmentId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (appointment.customerId !== customer.id) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este agendamento',
      );
    }

    return appointment;
  }

  private mapAppointment(appointment: any) {
    return {
      id: appointment.id,
      professionalId: appointment.professionalId,
      professionalName: appointment.professional?.user?.name,
      customerId: appointment.customerId,
      customerName: appointment.customer?.user?.name,
      serviceId: appointment.serviceId,
      serviceName: appointment.service?.name,
      serviceDuration: appointment.service?.duration,
      servicePrice: appointment.service?.price,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      notes: appointment.notes,
      createdAt: appointment.createdAt,
    };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
