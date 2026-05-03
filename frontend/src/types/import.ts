export type ImportStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED'

export type ImportRowStatus = 'SUCCESS' | 'ERROR'

export interface ImportJob {
  id: string
  fileName: string
  entityType: string
  status: ImportStatus
  totalRows: number
  successRows: number
  errorRows: number
  createdAt: string
  updatedAt: string
}

export interface ImportJobRow {
  id: string
  rowNumber: number
  rawData: Record<string, unknown>
  status: ImportRowStatus
  errorMessage: string | null
}

export interface ImportJobDetail extends ImportJob {
  rows: ImportJobRow[]
}
