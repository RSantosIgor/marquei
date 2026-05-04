import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { AppointmentsService } from '../src/appointments/appointments.service';
import { AppointmentsModule } from '../src/appointments/appointments.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('Double-Booking Prevention (e2e)', () => {
  let app: INestApplication;
  let service: AppointmentsService;
  const prisma = new PrismaClient();

  const TEST_PREFIX = 'dblbook-test-';

  const testUserIds: string[] = [];
  let testProfessionalId: string;
  let testServiceId: string;

  beforeAll(async () => {
    // Create test data directly via PrismaClient
    const hash = await bcrypt.hash('test123', 10);

    // Professional user + professional
    const profUser = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}prof@test.com`,
        password: hash,
        name: 'Test Professional',
        role: Role.PROFESSIONAL,
      },
    });
    const prof = await prisma.professional.create({
      data: { userId: profUser.id },
    });
    testProfessionalId = prof.id;

    // Service
    const svc = await prisma.service.create({
      data: {
        name: `${TEST_PREFIX}Service`,
        duration: 30,
        price: 50.0,
      },
    });
    testServiceId = svc.id;

    // Link professional to service
    await prisma.professionalService.create({
      data: { professionalId: prof.id, serviceId: svc.id },
    });

    // Work schedule (all weekdays 08:00-20:00)
    await prisma.workSchedule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        professionalId: prof.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00',
      })),
    });

    // 10 client users + customers
    for (let i = 0; i < 10; i++) {
      const user = await prisma.user.create({
        data: {
          email: `${TEST_PREFIX}client${i}@test.com`,
          password: hash,
          name: `Test Client ${i}`,
          role: Role.CLIENT,
        },
      });
      await prisma.customer.create({ data: { userId: user.id } });
      testUserIds.push(user.id);
    }

    // NestJS app for service DI
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AppointmentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = app.get(AppointmentsService);
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    await prisma.appointment.deleteMany({
      where: {
        professional: { user: { email: `${TEST_PREFIX}prof@test.com` } },
      },
    });
    await prisma.workSchedule.deleteMany({
      where: { professionalId: testProfessionalId },
    });
    await prisma.professionalService.deleteMany({
      where: { professionalId: testProfessionalId },
    });
    await prisma.professional.deleteMany({
      where: { id: testProfessionalId },
    });
    await prisma.customer.deleteMany({
      where: { user: { email: { startsWith: TEST_PREFIX } } },
    });
    await prisma.service.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: TEST_PREFIX } },
    });

    await app.close();
    await prisma.$disconnect();
  }, 15000);

  it('should accept only 1 out of 10 concurrent requests for the same slot', async () => {
    // Pick a date 30 days in the future at 10:00 UTC
    const target = new Date();
    target.setDate(target.getDate() + 30);
    target.setUTCHours(10, 0, 0, 0);
    const startTime = target.toISOString();

    // 10 different clients all try to book the same professional + slot concurrently
    const results = await Promise.allSettled(
      testUserIds.map((userId) =>
        service.create(userId, {
          professionalId: testProfessionalId,
          serviceId: testServiceId,
          startTime,
        }),
      ),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);

    // All failures should be ConflictException (409)
    for (const f of failures) {
      const reason = (f as PromiseRejectedResult).reason;
      expect(reason.status).toBe(409);
    }
  }, 30000);

  it('should allow booking a slot freed by cancellation', async () => {
    // Book a slot
    const target = new Date();
    target.setDate(target.getDate() + 31);
    target.setUTCHours(14, 0, 0, 0);

    const created = await service.create(testUserIds[0], {
      professionalId: testProfessionalId,
      serviceId: testServiceId,
      startTime: target.toISOString(),
    });

    // Cancel it
    await service.cancel(testUserIds[0], created.id);

    // Another client can now book the same slot
    const rebooked = await service.create(testUserIds[1], {
      professionalId: testProfessionalId,
      serviceId: testServiceId,
      startTime: target.toISOString(),
    });

    expect(rebooked.status).toBe('SCHEDULED');
    expect(rebooked.professionalId).toBe(testProfessionalId);
  }, 15000);
});
