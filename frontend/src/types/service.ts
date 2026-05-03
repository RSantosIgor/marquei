export interface Service {
  id: string
  name: string
  duration: number
  price: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateServiceData {
  name: string
  duration: number
  price: number
}

export interface UpdateServiceData {
  name?: string
  duration?: number
  price?: number
  active?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
