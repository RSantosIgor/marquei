import { api } from '@/lib/api'
import type { ImportJob, ImportJobDetail } from '@/types/import'

export type PaginatedImports = {
  data: ImportJob[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const importsService = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ data: ImportJob }>('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getAll: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedImports>('/imports', { params }),

  getOne: (id: string) =>
    api.get<{ data: ImportJobDetail }>(`/imports/${id}`),
}
