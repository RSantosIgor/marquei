import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
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
          role: Role.CLIENT,
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          notes: dto.notes,
        },
      });

      return {
        id: customer.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        notes: customer.notes,
        active: user.active,
        createdAt: user.createdAt,
      };
    });
  }

  async findAll(query: QueryCustomerDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const mapped = data.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.user.name,
      email: c.user.email,
      phone: c.user.phone,
      notes: c.notes,
      active: c.user.active,
      createdAt: c.user.createdAt,
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
    const customer = await this.prisma.customer.findUnique({
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
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return {
      id: customer.id,
      userId: customer.userId,
      name: customer.user.name,
      email: customer.user.email,
      phone: customer.user.phone,
      notes: customer.notes,
      active: customer.user.active,
      createdAt: customer.user.createdAt,
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.name || dto.phone !== undefined || dto.active !== undefined) {
        await tx.user.update({
          where: { id: customer.userId },
          data: {
            ...(dto.name && { name: dto.name }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.active !== undefined && { active: dto.active }),
          },
        });
      }

      if (dto.notes !== undefined) {
        await tx.customer.update({
          where: { id },
          data: { notes: dto.notes },
        });
      }

      return this.findOne(id);
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    await this.prisma.user.update({
      where: { id: customer.userId },
      data: { active: false },
    });

    return this.findOne(id);
  }
}
