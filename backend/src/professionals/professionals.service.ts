import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
  QueryProfessionalDto,
  SetScheduleDto,
  LinkServicesDto,
} from './dto';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProfessionalDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: Role.PROFESSIONAL,
        },
      });

      const professional = await tx.professional.create({
        data: {
          userId: user.id,
          specialty: dto.specialty,
        },
      });

      return {
        id: professional.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        specialty: professional.specialty,
        active: user.active,
        createdAt: user.createdAt,
      };
    });
  }

  async findAll(query: QueryProfessionalDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.professional.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              active: true,
              createdAt: true,
            },
          },
          services: {
            include: {
              service: {
                select: { id: true, name: true, duration: true, price: true },
              },
            },
          },
          workSchedules: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professional.count({ where }),
    ]);

    const mapped = data.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone,
      specialty: p.specialty,
      active: p.user.active,
      createdAt: p.user.createdAt,
      services: p.services.map((ps) => ps.service),
      workSchedules: p.workSchedules.map((ws) => ({
        id: ws.id,
        dayOfWeek: ws.dayOfWeek,
        startTime: ws.startTime,
        endTime: ws.endTime,
      })),
    }));

    return {
      data: mapped,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            active: true,
            createdAt: true,
          },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, duration: true, price: true },
            },
          },
        },
        workSchedules: true,
      },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return {
      id: professional.id,
      userId: professional.userId,
      name: professional.user.name,
      email: professional.user.email,
      phone: professional.user.phone,
      specialty: professional.specialty,
      active: professional.user.active,
      createdAt: professional.user.createdAt,
      services: professional.services.map((ps) => ps.service),
      workSchedules: professional.workSchedules.map((ws) => ({
        id: ws.id,
        dayOfWeek: ws.dayOfWeek,
        startTime: ws.startTime,
        endTime: ws.endTime,
      })),
    };
  }

  async update(id: string, dto: UpdateProfessionalDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.name || dto.phone !== undefined || dto.active !== undefined) {
        await tx.user.update({
          where: { id: professional.userId },
          data: {
            ...(dto.name && { name: dto.name }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.active !== undefined && { active: dto.active }),
          },
        });
      }

      if (dto.specialty !== undefined) {
        await tx.professional.update({
          where: { id },
          data: { specialty: dto.specialty },
        });
      }

      return this.findOne(id);
    });
  }

  async remove(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    await this.prisma.user.update({
      where: { id: professional.userId },
      data: { active: false },
    });

    return this.findOne(id);
  }

  async setSchedule(id: string, dto: SetScheduleDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    // Validate start < end for each entry
    for (const entry of dto.entries) {
      if (entry.startTime >= entry.endTime) {
        throw new BadRequestException(
          `Horário inválido: início (${entry.startTime}) deve ser anterior ao fim (${entry.endTime})`,
        );
      }
    }

    // Replace all schedules in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.workSchedule.deleteMany({
        where: { professionalId: id },
      });

      if (dto.entries.length > 0) {
        await tx.workSchedule.createMany({
          data: dto.entries.map((entry) => ({
            professionalId: id,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  async linkServices(id: string, dto: LinkServicesDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    // Validate that all services exist
    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds } },
    });

    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException('Um ou mais serviços não foram encontrados');
    }

    // Replace all service links in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.professionalService.deleteMany({
        where: { professionalId: id },
      });

      if (dto.serviceIds.length > 0) {
        await tx.professionalService.createMany({
          data: dto.serviceIds.map((serviceId) => ({
            professionalId: id,
            serviceId,
          })),
        });
      }
    });

    return this.findOne(id);
  }
}
