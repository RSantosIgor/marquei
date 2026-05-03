import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationJobData {
  appointmentId: string;
  userId: string;
  type: NotificationType;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { appointmentId, userId, type } = job.data;

    try {
      await this.prisma.notification.upsert({
        where: {
          appointmentId_type: { appointmentId, type },
        },
        update: { sentAt: new Date() },
        create: { userId, appointmentId, type, sentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to process notification job ${job.id}: ${error.message}`,
      );
      throw error;
    }
  }
}
