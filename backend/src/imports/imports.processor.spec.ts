import { Test, TestingModule } from '@nestjs/testing';
import { ImportStatus, ImportRowStatus, Role } from '@prisma/client';
import { ImportsProcessor } from './imports.processor';
import { PrismaService } from '../prisma/prisma.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCsv(rows: string[]): string {
  const content = ['name,email,phone', ...rows].join('\n');
  return Buffer.from(content).toString('base64');
}

function makePrismaStub() {
  return {
    importJob: {
      update: jest.fn().mockResolvedValue({}),
    },
    importJobRow: {
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({
        id: `user-${data.email}`,
        ...data,
      })),
    },
    customer: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((fn) =>
      fn({
        user: {
          create: jest.fn().mockImplementation(({ data }) => ({
            id: `user-${data.email}`,
            ...data,
          })),
        },
        customer: {
          create: jest.fn().mockResolvedValue({}),
        },
      }),
    ),
  };
}

function makeJob(data: any) {
  return { data } as any;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ImportsProcessor', () => {
  let processor: ImportsProcessor;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(async () => {
    prisma = makePrismaStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsProcessor,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = module.get(ImportsProcessor);
  });

  it('should complete successfully when all rows are valid', async () => {
    const csv = makeCsv([
      'Ana Silva,ana@test.com,11999990001',
      'Bruno Costa,bruno@test.com,11999990002',
    ]);

    await processor.process(
      makeJob({ importJobId: 'job-1', fileContent: csv, fileType: 'csv' }),
    );

    // Should set totalRows = 2
    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: { totalRows: 2 },
      }),
    );

    // Should set final status COMPLETED with 2 success, 0 errors
    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: {
          status: ImportStatus.COMPLETED,
          successRows: 2,
          errorRows: 0,
        },
      }),
    );
  });

  it('should mark COMPLETED_WITH_ERRORS on partial failure', async () => {
    const csv = makeCsv([
      'Ana Silva,ana@test.com,11999990001',
      'Invalid Row,,', // missing name and email
      'Carlos Lima,carlos@test.com,11999990003',
    ]);

    await processor.process(
      makeJob({ importJobId: 'job-2', fileContent: csv, fileType: 'csv' }),
    );

    // Final status: partial success
    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-2' },
        data: {
          status: ImportStatus.COMPLETED_WITH_ERRORS,
          successRows: 2,
          errorRows: 1,
        },
      }),
    );

    // Error row should be logged
    expect(prisma.importJobRow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          importJobId: 'job-2',
          rowNumber: 2,
          status: ImportRowStatus.ERROR,
          errorMessage: expect.stringContaining('obrigatórios'),
        }),
      }),
    );
  });

  it('should mark FAILED when all rows have errors', async () => {
    const csv = makeCsv([
      ',invalid-email,', // missing name
      'Bob,,', // missing email
    ]);

    await processor.process(
      makeJob({ importJobId: 'job-3', fileContent: csv, fileType: 'csv' }),
    );

    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-3' },
        data: {
          status: ImportStatus.FAILED,
          successRows: 0,
          errorRows: 2,
        },
      }),
    );
  });

  it('should reject duplicate emails', async () => {
    // First call: no existing user. Second call: user already exists
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-user' });

    const csv = makeCsv([
      'Ana Silva,ana@test.com,11999990001',
      'Ana Duplicate,ana@test.com,11999990002', // same email
    ]);

    await processor.process(
      makeJob({ importJobId: 'job-4', fileContent: csv, fileType: 'csv' }),
    );

    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-4' },
        data: {
          status: ImportStatus.COMPLETED_WITH_ERRORS,
          successRows: 1,
          errorRows: 1,
        },
      }),
    );

    expect(prisma.importJobRow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rowNumber: 2,
          status: ImportRowStatus.ERROR,
          errorMessage: expect.stringContaining('já cadastrado'),
        }),
      }),
    );
  });

  it('should reject rows with invalid email format', async () => {
    const csv = makeCsv(['Ana Silva,not-an-email,11999990001']);

    await processor.process(
      makeJob({ importJobId: 'job-5', fileContent: csv, fileType: 'csv' }),
    );

    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-5' },
        data: {
          status: ImportStatus.FAILED,
          successRows: 0,
          errorRows: 1,
        },
      }),
    );

    expect(prisma.importJobRow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorMessage: expect.stringContaining('inválido'),
        }),
      }),
    );
  });

  it('should set status to FAILED when file parsing fails', async () => {
    const invalidContent = Buffer.from(
      'not valid csv content \x00\x01\x02',
    ).toString('base64');

    await processor.process(
      makeJob({
        importJobId: 'job-6',
        fileContent: invalidContent,
        fileType: 'xlsx',
      }),
    );

    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-6' },
        data: { status: ImportStatus.FAILED },
      }),
    );
  });
});
