import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { notificationsService } from '@/services/notifications.service'
import type { Notification, NotificationType } from '@/types/notification'

const TYPE_LABELS: Record<NotificationType, string> = {
  CONFIRMATION: 'Agendamento confirmado',
  REMINDER_24H: 'Lembrete: amanhã',
  CANCELLATION: 'Agendamento cancelado',
  RESCHEDULE: 'Agendamento remarcado',
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function NotificationBell() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => notificationsService.getMyNotifications(),
    refetchInterval: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] })
    },
  })

  const notifications: Notification[] = data?.data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-0.5 py-2 ${!n.readAt ? 'bg-accent/50' : ''}`}
              onClick={() => {
                if (!n.readAt) markReadMutation.mutate(n.id)
              }}
            >
              <span className="text-sm font-medium">{TYPE_LABELS[n.type]}</span>
              <span className="text-xs text-muted-foreground">
                {n.appointment.serviceName} •{' '}
                {formatDate(n.appointment.startTime)}{' '}
                {formatTime(n.appointment.startTime)}
              </span>
              {n.appointment.professionalName && (
                <span className="text-xs text-muted-foreground">
                  Profissional: {n.appointment.professionalName}
                </span>
              )}
              {n.appointment.customerName && (
                <span className="text-xs text-muted-foreground">
                  Cliente: {n.appointment.customerName}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
