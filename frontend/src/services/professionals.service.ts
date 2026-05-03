import { api } from '@/lib/api'
import type {
  Professional,
  CreateProfessionalData,
  UpdateProfessionalData,
  SetScheduleData,
  LinkServicesData,
} from '@/types/professional'
import type { PaginatedResponse } from '@/types/service'

export const professionalsService = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Professional>>('/professionals', { params }),

  getById: (id: string) =>
    api.get<{ data: Professional }>(`/professionals/${id}`),

  create: (data: CreateProfessionalData) =>
    api.post<{ data: Professional }>('/professionals', data),

  update: (id: string, data: UpdateProfessionalData) =>
    api.patch<{ data: Professional }>(`/professionals/${id}`, data),

  remove: (id: string) =>
    api.delete<{ data: Professional }>(`/professionals/${id}`),

  setSchedule: (id: string, data: SetScheduleData) =>
    api.put<{ data: Professional }>(`/professionals/${id}/schedule`, data),

  linkServices: (id: string, data: LinkServicesData) =>
    api.put<{ data: Professional }>(`/professionals/${id}/services`, data),
}
