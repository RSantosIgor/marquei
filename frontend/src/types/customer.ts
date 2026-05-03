export interface Customer {
  id: string
  userId: string
  name: string
  email: string
  phone: string | null
  notes: string | null
  active: boolean
  createdAt: string
}

export interface CreateCustomerData {
  name: string
  email: string
  password: string
  phone?: string
  notes?: string
}

export interface UpdateCustomerData {
  name?: string
  phone?: string
  notes?: string
  active?: boolean
}
