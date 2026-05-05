export type NotificationType = 'CONFIRMATION' | 'REMINDER_24H' | 'CANCELLATION' | 'RESCHEDULE'

export interface Notification {
  id: string
  type: NotificationType
  sentAt: string | null
  readAt: string | null
  createdAt: string
  appointment: {
    id: string
    startTime: string
    serviceName: string | null
    professionalName: string | null
    customerName: string | null
  }
}
