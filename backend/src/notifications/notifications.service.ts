import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationJobData } from './notifications.processor';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async dispatch(
    appointmentId: string,
    userId: string,
    type: NotificationType,
    delay?: number,
  ): Promise<void> {
    const jobId = `${appointmentId}-${type}-${userId}`;
    const data: NotificationJobData = { appointmentId, userId, type };
    await this.notificationsQueue.add('send-notification', data, {
      jobId,
      delay,
    });
  }

  async removeDelayedJob(jobId: string): Promise<void> {
    try {
      const job = await this.notificationsQueue.getJob(jobId);
      if (job) await job.remove();
    } catch {
      // ignore — job may not exist or already processed
    }
  }

  async findMyNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      include: {
        appointment: {
          include: {
            service: { select: { name: true } },
            professional: { include: { user: { select: { name: true } } } },
            customer: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        sentAt: n.sentAt,
        readAt: n.readAt,
        createdAt: n.createdAt,
        appointment: {
          id: n.appointment.id,
          startTime: n.appointment.startTime,
          serviceName: n.appointment.service?.name,
          professionalName: n.appointment.professional?.user?.name,
          customerName: n.appointment.customer?.user?.name,
        },
      })),
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) return;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }
}
