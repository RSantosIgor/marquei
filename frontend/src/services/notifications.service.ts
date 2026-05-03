import { api } from '@/lib/api'
import type { Notification } from '@/types/notification'

export const notificationsService = {
  getMyNotifications: () =>
    api.get<{ data: Notification[] }>('/notifications/my'),

  markRead: (id: string) =>
    api.patch<{ data: { success: boolean } }>(`/notifications/${id}/read`),
}
