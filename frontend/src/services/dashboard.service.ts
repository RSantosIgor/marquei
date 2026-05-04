import { api } from '@/lib/api'

export interface OccupancyEntry {
  professionalId: string
  professionalName: string
  total: number
  scheduled: number
  completed: number
  noShow: number
  cancelled: number
}

export interface TopService {
  serviceId: string
  serviceName: string
  count: number
}

export interface DashboardStats {
  period: { from: string; to: string }
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowRate: number
  estimatedRevenue: number
  occupancyByProfessional: OccupancyEntry[]
  topServices: TopService[]
}

export const dashboardService = {
  getStats: (params?: { from?: string; to?: string }) =>
    api.get<DashboardStats>('/dashboard/stats', { params }),
}
