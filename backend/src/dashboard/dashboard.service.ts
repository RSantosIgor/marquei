import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CacheEntry {
  key: string;
  data: any;
  expiresAt: number;
}

@Injectable()
export class DashboardService {
  private cache: CacheEntry | null = null;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  async getStats(from?: string, to?: string) {
    const today = new Date().toISOString().split('T')[0];
    const resolvedFrom = from ?? this.getFirstDayOfMonth(today);
    const resolvedTo = to ?? today;
    const cacheKey = `${resolvedFrom}-${resolvedTo}`;

    if (
      this.cache &&
      this.cache.key === cacheKey &&
      Date.now() < this.cache.expiresAt
    ) {
      return this.cache.data;
    }

    const fromDate = new Date(resolvedFrom + 'T00:00:00.000Z');
    const toDate = new Date(resolvedTo + 'T23:59:59.999Z');

    const [appointments, professionals] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { startTime: { gte: fromDate, lte: toDate } },
        include: {
          professional: { include: { user: { select: { name: true } } } },
          service: true,
        },
      }),
      this.prisma.professional.findMany({
        where: { active: true },
        include: { user: { select: { name: true } } },
      }),
    ]);

    // Occupancy by professional
    const occupancyByProfessional = professionals
      .map((pro) => {
        const proApts = appointments.filter(
          (a) => a.professionalId === pro.id,
        );
        return {
          professionalId: pro.id,
          professionalName: pro.user.name,
          total: proApts.length,
          scheduled: proApts.filter(
            (a) => a.status === AppointmentStatus.SCHEDULED,
          ).length,
          completed: proApts.filter(
            (a) => a.status === AppointmentStatus.COMPLETED,
          ).length,
          noShow: proApts.filter(
            (a) => a.status === AppointmentStatus.NO_SHOW,
          ).length,
          cancelled: proApts.filter(
            (a) => a.status === AppointmentStatus.CANCELLED,
          ).length,
        };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total);

    // No-show rate (among concluded appointments)
    const concluded = appointments.filter(
      (a) =>
        a.status === AppointmentStatus.COMPLETED ||
        a.status === AppointmentStatus.NO_SHOW,
    );
    const noShows = appointments.filter(
      (a) => a.status === AppointmentStatus.NO_SHOW,
    );
    const noShowRate =
      concluded.length > 0
        ? Math.round((noShows.length / concluded.length) * 1000) / 10
        : 0;

    // Estimated revenue from COMPLETED appointments
    const estimatedRevenue = appointments
      .filter((a) => a.status === AppointmentStatus.COMPLETED)
      .reduce((sum, a) => sum + Number(a.service.price), 0);

    // Top 5 services by appointment count
    const serviceCount: Record<
      string,
      { serviceId: string; serviceName: string; count: number }
    > = {};
    for (const apt of appointments) {
      if (!serviceCount[apt.serviceId]) {
        serviceCount[apt.serviceId] = {
          serviceId: apt.serviceId,
          serviceName: apt.service.name,
          count: 0,
        };
      }
      serviceCount[apt.serviceId].count++;
    }
    const topServices = Object.values(serviceCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stats = {
      period: { from: resolvedFrom, to: resolvedTo },
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(
        (a) => a.status === AppointmentStatus.COMPLETED,
      ).length,
      cancelledAppointments: appointments.filter(
        (a) => a.status === AppointmentStatus.CANCELLED,
      ).length,
      noShowRate,
      estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
      occupancyByProfessional,
      topServices,
    };

    this.cache = { key: cacheKey, data: stats, expiresAt: Date.now() + this.TTL };
    return stats;
  }

  private getFirstDayOfMonth(dateStr: string): string {
    const [year, month] = dateStr.split('-');
    return `${year}-${month}-01`;
  }
}
