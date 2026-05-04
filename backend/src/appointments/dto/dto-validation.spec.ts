import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from './create-appointment.dto';
import { QueryAvailabilityDto } from './query-availability.dto';
import { UpdateStatusDto } from './update-status.dto';
import { RescheduleAppointmentDto } from './reschedule-appointment.dto';

describe('Appointment DTOs validation', () => {
  // ── CreateAppointmentDto ────────────────────────────────────────────────

  describe('CreateAppointmentDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        professionalId: 'uuid-1',
        serviceId: 'uuid-2',
        startTime: '2099-06-15T10:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with optional notes', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        professionalId: 'uuid-1',
        serviceId: 'uuid-2',
        startTime: '2099-06-15T10:00:00.000Z',
        notes: 'Alergia a produtos químicos',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when professionalId is missing', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        serviceId: 'uuid-2',
        startTime: '2099-06-15T10:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'professionalId')).toBe(true);
    });

    it('should fail when serviceId is missing', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        professionalId: 'uuid-1',
        startTime: '2099-06-15T10:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'serviceId')).toBe(true);
    });

    it('should fail with invalid startTime format', async () => {
      const dto = plainToInstance(CreateAppointmentDto, {
        professionalId: 'uuid-1',
        serviceId: 'uuid-2',
        startTime: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'startTime')).toBe(true);
    });
  });

  // ── QueryAvailabilityDto ────────────────────────────────────────────────

  describe('QueryAvailabilityDto', () => {
    it('should pass with valid YYYY-MM-DD date', async () => {
      const dto = plainToInstance(QueryAvailabilityDto, {
        professionalId: 'uuid-1',
        serviceId: 'uuid-2',
        date: '2099-06-15',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with wrong date format', async () => {
      const dto = plainToInstance(QueryAvailabilityDto, {
        professionalId: 'uuid-1',
        serviceId: 'uuid-2',
        date: '15/06/2099',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'date')).toBe(true);
    });

    it('should fail when date is missing', async () => {
      const dto = plainToInstance(QueryAvailabilityDto, {
        professionalId: 'uuid-1',
        serviceId: 'uuid-2',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── UpdateStatusDto ─────────────────────────────────────────────────────

  describe('UpdateStatusDto', () => {
    it('should pass with valid enum value COMPLETED', async () => {
      const dto = plainToInstance(UpdateStatusDto, {
        status: AppointmentStatus.COMPLETED,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid enum value CANCELLED', async () => {
      const dto = plainToInstance(UpdateStatusDto, {
        status: AppointmentStatus.CANCELLED,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid status value', async () => {
      const dto = plainToInstance(UpdateStatusDto, {
        status: 'INVALID_STATUS',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'status')).toBe(true);
    });

    it('should fail when status is missing', async () => {
      const dto = plainToInstance(UpdateStatusDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── RescheduleAppointmentDto ────────────────────────────────────────────

  describe('RescheduleAppointmentDto', () => {
    it('should pass with valid date string', async () => {
      const dto = plainToInstance(RescheduleAppointmentDto, {
        startTime: '2099-06-15T14:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid date string', async () => {
      const dto = plainToInstance(RescheduleAppointmentDto, {
        startTime: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when startTime is missing', async () => {
      const dto = plainToInstance(RescheduleAppointmentDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
