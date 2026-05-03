export interface WorkScheduleEntry {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface ProfessionalService {
  id: string
  name: string
  duration: number
  price: string
}

export interface Professional {
  id: string
  userId: string
  name: string
  email: string
  phone: string | null
  specialty: string | null
  active: boolean
  createdAt: string
  services: ProfessionalService[]
  workSchedules: WorkScheduleEntry[]
}

export interface CreateProfessionalData {
  name: string
  email: string
  password: string
  phone?: string
  specialty?: string
}

export interface UpdateProfessionalData {
  name?: string
  phone?: string
  specialty?: string
  active?: boolean
}

export interface SetScheduleData {
  entries: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}

export interface LinkServicesData {
  serviceIds: string[]
}
