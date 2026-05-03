import { api } from '@/lib/api'
import type { Service, CreateServiceData, UpdateServiceData, PaginatedResponse } from '@/types/service'

export const servicesService = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Service>>('/services', { params }),

  getById: (id: string) =>
    api.get<{ data: Service }>(`/services/${id}`),

  create: (data: CreateServiceData) =>
    api.post<{ data: Service }>('/services', data),

  update: (id: string, data: UpdateServiceData) =>
    api.patch<{ data: Service }>(`/services/${id}`, data),

  remove: (id: string) =>
    api.delete<{ data: Service }>(`/services/${id}`),
}
