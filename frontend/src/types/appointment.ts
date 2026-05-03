export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'

export interface Appointment {
  id: string
  professionalId: string
  professionalName: string
  customerId?: string
  customerName?: string
  serviceId: string
  serviceName: string
  serviceDuration: number
  servicePrice: number
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
}

export interface AvailableProfessional {
  id: string
  name: string
  specialty: string | null
  workSchedules: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}

export interface AvailabilityResponse {
  data: {
    date: string
    slots: string[]
  }
}

export interface CreateAppointmentData {
  professionalId: string
  serviceId: string
  startTime: string
  notes?: string
}
