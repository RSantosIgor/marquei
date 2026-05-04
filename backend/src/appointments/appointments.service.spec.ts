import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePrismaStub(): any {
  return {
    service: { findUnique: jest.fn() },
    professional: { findUnique: jest.fn() },
    appointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    customer: { findUnique: jest.fn() },
    professionalService: { findUnique: jest.fn() },
    $transaction: jest.fn((fn) => fn(makePrismaStub())),
    $queryRaw: jest.fn(),
  };
}

function makeNotificationsStub() {
  return {
    dispatch: jest.fn().mockResolvedValue(undefined),
    removeDelayedJob: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: ReturnType<typeof makePrismaStub>;
  let notifications: ReturnType<typeof makeNotificationsStub>;

  beforeEach(async () => {
    prisma = makePrismaStub();
    notifications = makeNotificationsStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getAvailability — slot calculation
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAvailability', () => {
    const TEST_DATE = '2099-06-02';
    const TEST_DAY = new Date(TEST_DATE + 'T00:00:00').getUTCDay(); // compute actual day of week
    const OTHER_DAY = (TEST_DAY + 1) % 7; // a different day

    const query = {
      professionalId: 'prof-1',
      serviceId: 'svc-1',
      date: TEST_DATE,
    };

    it('should return empty slots when professional has no schedule for the day', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        duration: 30,
      });
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        workSchedules: [
          { dayOfWeek: OTHER_DAY, startTime: '08:00', endTime: '12:00' },
        ],
      });
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailability(query);
      expect(result.data.slots).toEqual([]);
    });

    it('should generate correct slots for a 30-min service in a 2-hour window', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        duration: 30,
      });
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        workSchedules: [
          { dayOfWeek: TEST_DAY, startTime: '08:00', endTime: '10:00' },
        ],
      });
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailability(query);
      // 08:00, 08:30, 09:00, 09:30 (10:00 wouldn't fit 30 min)
      expect(result.data.slots).toEqual(['08:00', '08:30', '09:00', '09:30']);
    });

    it('should exclude slots that overlap with existing appointments', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        duration: 60,
      });
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        workSchedules: [
          { dayOfWeek: TEST_DAY, startTime: '08:00', endTime: '12:00' },
        ],
      });
      // Existing appointment from 09:00 to 10:00
      prisma.appointment.findMany.mockResolvedValue([
        {
          startTime: new Date(TEST_DATE + 'T09:00:00.000Z'),
          endTime: new Date(TEST_DATE + 'T10:00:00.000Z'),
        },
      ]);

      const result = await service.getAvailability(query);
      // 08:00 is ok (08:00-09:00), 09:00 conflicts, 10:00 is ok, 11:00 is ok
      expect(result.data.slots).toEqual(['08:00', '10:00', '11:00']);
    });

    it('should generate slots across multiple work schedule windows', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        duration: 60,
      });
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        workSchedules: [
          { dayOfWeek: TEST_DAY, startTime: '08:00', endTime: '10:00' }, // morning
          { dayOfWeek: TEST_DAY, startTime: '14:00', endTime: '16:00' }, // afternoon
        ],
      });
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailability(query);
      expect(result.data.slots).toEqual(['08:00', '09:00', '14:00', '15:00']);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        workSchedules: [],
      });

      await expect(service.getAvailability(query)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        duration: 30,
      });
      prisma.professional.findUnique.mockResolvedValue(null);

      await expect(service.getAvailability(query)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not generate slots when service duration exceeds window', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        duration: 120,
      });
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        workSchedules: [
          { dayOfWeek: TEST_DAY, startTime: '08:00', endTime: '09:00' }, // only 60 min window
        ],
      });
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailability(query);
      expect(result.data.slots).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // updateStatus — status transitions
  // ──────────────────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    const baseAppointment = {
      id: 'apt-1',
      professionalId: 'prof-1',
      status: AppointmentStatus.SCHEDULED,
      professional: { userId: 'user-prof', user: { name: 'Dr. Test' } },
      customer: { user: { name: 'Client Test' } },
      service: { name: 'Corte', duration: 30, price: 50 },
      startTime: new Date(),
      endTime: new Date(),
    };

    it('should allow SCHEDULED → COMPLETED', async () => {
      prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
      prisma.appointment.update.mockResolvedValue({
        ...baseAppointment,
        status: AppointmentStatus.COMPLETED,
      });

      const result = await service.updateStatus(
        'user-manager',
        'MANAGER',
        'apt-1',
        {
          status: AppointmentStatus.COMPLETED,
        },
      );
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should allow SCHEDULED → NO_SHOW', async () => {
      prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
      prisma.appointment.update.mockResolvedValue({
        ...baseAppointment,
        status: AppointmentStatus.NO_SHOW,
      });

      const result = await service.updateStatus(
        'user-manager',
        'MANAGER',
        'apt-1',
        {
          status: AppointmentStatus.NO_SHOW,
        },
      );
      expect(result.status).toBe(AppointmentStatus.NO_SHOW);
    });

    it('should allow SCHEDULED → CANCELLED', async () => {
      prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
      prisma.appointment.update.mockResolvedValue({
        ...baseAppointment,
        status: AppointmentStatus.CANCELLED,
      });

      const result = await service.updateStatus(
        'user-manager',
        'MANAGER',
        'apt-1',
        {
          status: AppointmentStatus.CANCELLED,
        },
      );
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('should reject transition from COMPLETED status', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...baseAppointment,
        status: AppointmentStatus.COMPLETED,
      });

      await expect(
        service.updateStatus('user-manager', 'MANAGER', 'apt-1', {
          status: AppointmentStatus.CANCELLED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition from CANCELLED status', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...baseAppointment,
        status: AppointmentStatus.CANCELLED,
      });

      await expect(
        service.updateStatus('user-manager', 'MANAGER', 'apt-1', {
          status: AppointmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition to SCHEDULED (not an allowed target)', async () => {
      prisma.appointment.findUnique.mockResolvedValue(baseAppointment);

      await expect(
        service.updateStatus('user-manager', 'MANAGER', 'apt-1', {
          status: AppointmentStatus.SCHEDULED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('user-manager', 'MANAGER', 'apt-1', {
          status: AppointmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when professional tries to update another professionals appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...baseAppointment,
        professional: { userId: 'other-user', user: { name: 'Other' } },
      });

      await expect(
        service.updateStatus('user-prof', 'PROFESSIONAL', 'apt-1', {
          status: AppointmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow professional to update their own appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
      prisma.appointment.update.mockResolvedValue({
        ...baseAppointment,
        status: AppointmentStatus.COMPLETED,
      });

      const result = await service.updateStatus(
        'user-prof',
        'PROFESSIONAL',
        'apt-1',
        {
          status: AppointmentStatus.COMPLETED,
        },
      );
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // cancel — 24h cancellation policy
  // ──────────────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should reject cancellation within 24h of start time', async () => {
      const soon = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        userId: 'user-1',
      });
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        customerId: 'cust-1',
        status: AppointmentStatus.SCHEDULED,
        startTime: soon,
      });

      await expect(service.cancel('user-1', 'apt-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow cancellation more than 24h before start time', async () => {
      const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        userId: 'user-1',
      });
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        customerId: 'cust-1',
        status: AppointmentStatus.SCHEDULED,
        startTime: farFuture,
        professionalId: 'prof-1',
        serviceId: 'svc-1',
      });
      prisma.appointment.update.mockResolvedValue({
        id: 'apt-1',
        status: AppointmentStatus.CANCELLED,
        professional: { user: { name: 'Dr. Test' } },
        service: { name: 'Corte', duration: 30, price: 50 },
        startTime: farFuture,
        endTime: farFuture,
      });

      const result = await service.cancel('user-1', 'apt-1');
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('should reject cancellation of non-SCHEDULED appointments', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        userId: 'user-1',
      });
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        customerId: 'cust-1',
        status: AppointmentStatus.COMPLETED,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      await expect(service.cancel('user-1', 'apt-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
