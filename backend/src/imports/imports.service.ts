import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { ImportJobData } from './imports.processor';
import { QueryImportJobsDto } from './dto';

@Injectable()
export class ImportsService {
  constructor(
    @InjectQueue('imports') private importsQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async upload(file: Express.Multer.File) {
    const originalName = file.originalname.toLowerCase();
    const fileType: 'csv' | 'xlsx' = originalName.endsWith('.xlsx')
      ? 'xlsx'
      : 'csv';

    const importJob = await this.prisma.importJob.create({
      data: {
        fileName: file.originalname,
        entityType: 'customers',
      },
    });

    const fileContent = file.buffer.toString('base64');
    const jobData: ImportJobData = {
      importJobId: importJob.id,
      fileContent,
      fileType,
    };

    await this.importsQueue.add('process-import', jobData, {
      jobId: `import-${importJob.id}`,
    });

    return { data: this.mapImportJob(importJob) };
  }

  async findAll(query: QueryImportJobsDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.importJob.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.importJob.count(),
    ]);

    return {
      data: data.map((j) => this.mapImportJob(j)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const importJob = await this.prisma.importJob.findUnique({
      where: { id },
      include: {
        rows: { orderBy: { rowNumber: 'asc' } },
      },
    });

    if (!importJob) {
      throw new NotFoundException('Job de importação não encontrado');
    }

    return {
      data: {
        ...this.mapImportJob(importJob),
        rows: importJob.rows.map((r) => ({
          id: r.id,
          rowNumber: r.rowNumber,
          rawData: r.rawData,
          status: r.status,
          errorMessage: r.errorMessage,
        })),
      },
    };
  }

  private mapImportJob(job: any) {
    return {
      id: job.id,
      fileName: job.fileName,
      entityType: job.entityType,
      status: job.status,
      totalRows: job.totalRows,
      successRows: job.successRows,
      errorRows: job.errorRows,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
