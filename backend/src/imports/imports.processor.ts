import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Role, ImportStatus, ImportRowStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportJobData {
  importJobId: string;
  fileContent: string; // base64
  fileType: 'csv' | 'xlsx';
}

type CsvRow = Record<string, string>;

@Processor('imports')
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { importJobId, fileContent, fileType } = job.data;

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { status: ImportStatus.PROCESSING },
    });

    let rows: CsvRow[] = [];

    try {
      const buffer = Buffer.from(fileContent, 'base64');
      if (fileType === 'csv') {
        rows = parse(buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as CsvRow[];
      } else {
        rows = await this.parseExcel(buffer);
      }
    } catch (err) {
      this.logger.error(`Failed to parse file for job ${importJobId}: ${err.message}`);
      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: { status: ImportStatus.FAILED },
      });
      return;
    }

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { totalRows: rows.length },
    });

    let successRows = 0;
    let errorRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        await this.processCustomerRow(row, importJobId, rowNumber);
        successRows++;
      } catch (err) {
        await this.prisma.importJobRow.create({
          data: {
            importJobId,
            rowNumber,
            rawData: row,
            status: ImportRowStatus.ERROR,
            errorMessage: err.message || 'Erro desconhecido',
          },
        });
        errorRows++;
      }
    }

    const finalStatus =
      errorRows === 0
        ? ImportStatus.COMPLETED
        : successRows === 0
          ? ImportStatus.FAILED
          : ImportStatus.COMPLETED_WITH_ERRORS;

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { status: finalStatus, successRows, errorRows },
    });

    this.logger.log(
      `Import job ${importJobId} finished: ${finalStatus} (${successRows} ok, ${errorRows} errors)`,
    );
  }

  private async parseExcel(buffer: Buffer): Promise<CsvRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value ?? ''));
    });

    const rows: CsvRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: CsvRow = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) obj[header] = String(cell.value ?? '');
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    });

    return rows;
  }

  private async processCustomerRow(
    row: CsvRow,
    importJobId: string,
    rowNumber: number,
  ): Promise<void> {
    const name = row['name']?.trim();
    const email = row['email']?.trim()?.toLowerCase();
    const phone = row['phone']?.trim() || null;

    if (!name || !email) {
      throw new Error('Campos obrigatórios ausentes: name, email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`E-mail inválido: ${email}`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error(`E-mail já cadastrado: ${email}`);
    }

    const password = await bcrypt.hash('Importado@123', 10);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phone, password, role: Role.CLIENT },
      });
      await tx.customer.create({ data: { userId: user.id } });
    });

    await this.prisma.importJobRow.create({
      data: {
        importJobId,
        rowNumber,
        rawData: row,
        status: ImportRowStatus.SUCCESS,
      },
    });
  }
}
