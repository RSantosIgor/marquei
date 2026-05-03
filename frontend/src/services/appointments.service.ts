import { api } from '@/lib/api'
import type {
  Appointment,
  AppointmentStatus,
  AvailableProfessional,
  AvailabilityResponse,
  CreateAppointmentData,
} from '@/types/appointment'
import type { Service, PaginatedResponse } from '@/types/service'

export const appointmentsService = {
  // ─── Client booking ─────────────────────────────
  getAvailableServices: () =>
    api.get<{ data: Service[] }>('/appointments/services'),

  getProfessionalsForService: (serviceId: string) =>
    api.get<{ data: AvailableProfessional[] }>('/appointments/professionals', {
      params: { serviceId },
    }),

  getAvailability: (params: {
    professionalId: string
    serviceId: string
    date: string
  }) => api.get<AvailabilityResponse>('/appointments/availability', { params }),

  create: (data: CreateAppointmentData) =>
    api.post<{ data: Appointment }>('/appointments', data),

  getMyAppointments: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Appointment>>('/appointments/mine', { params }),

  reschedule: (id: string, data: { startTime: string }) =>
    api.patch<{ data: Appointment }>(`/appointments/${id}/reschedule`, data),

  cancel: (id: string) =>
    api.patch<{ data: Appointment }>(`/appointments/${id}/cancel`),

  // ─── Manager ────────────────────────────────────
  getAll: (params?: {
    date?: string
    professionalId?: string
    status?: AppointmentStatus
    page?: number
    limit?: number
  }) => api.get<PaginatedResponse<Appointment>>('/appointments/all', { params }),

  // ─── Professional ───────────────────────────────
  getMySchedule: (date: string) =>
    api.get<{ data: Appointment[] }>('/appointments/my-schedule', {
      params: { date },
    }),

  // ─── Status update (professional + manager) ─────
  updateStatus: (id: string, status: AppointmentStatus) =>
    api.patch<{ data: Appointment }>(`/appointments/${id}/status`, { status }),
}
