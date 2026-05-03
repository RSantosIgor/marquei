import { api } from '@/lib/api'
import type { Customer, CreateCustomerData, UpdateCustomerData } from '@/types/customer'
import type { PaginatedResponse } from '@/types/service'

export const customersService = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Customer>>('/customers', { params }),

  getById: (id: string) =>
    api.get<{ data: Customer }>(`/customers/${id}`),

  create: (data: CreateCustomerData) =>
    api.post<{ data: Customer }>('/customers', data),

  update: (id: string, data: UpdateCustomerData) =>
    api.patch<{ data: Customer }>(`/customers/${id}`, data),

  remove: (id: string) =>
    api.delete<{ data: Customer }>(`/customers/${id}`),
}
