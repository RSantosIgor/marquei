import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { appointmentsService } from '@/services/appointments.service'
import type { Appointment, AppointmentStatus } from '@/types/appointment'
import {
  CalendarDays,
  Clock,
  Scissors,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado',
  COMPLETED: 'Realizado',
  NO_SHOW: 'Não compareceu',
  CANCELLED: 'Cancelado',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SCHEDULED: 'default',
  COMPLETED: 'secondary',
  NO_SHOW: 'destructive',
  CANCELLED: 'outline',
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value))
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function ProfessionalSchedulePage() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(getTodayString())
  const [statusTarget, setStatusTarget] = useState<{
    appointment: Appointment
    newStatus: AppointmentStatus
  } | null>(null)

  const { data: scheduleRes, isLoading } = useQuery({
    queryKey: ['professional-schedule', date],
    queryFn: () => appointmentsService.getMySchedule(date),
  })

  const statusMutation = useMutation({
    mutationFn: () =>
      appointmentsService.updateStatus(
        statusTarget!.appointment.id,
        statusTarget!.newStatus,
      ),
    onSuccess: () => {
      const label = STATUS_LABELS[statusTarget!.newStatus]
      toast.success(`Status alterado para "${label}"`)
      queryClient.invalidateQueries({ queryKey: ['professional-schedule'] })
      setStatusTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao alterar status')
    },
  })

  const appointments = scheduleRes?.data?.data ?? []

  function openStatusChange(appointment: Appointment, newStatus: AppointmentStatus) {
    setStatusTarget({ appointment, newStatus })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e gerencie seus atendimentos do dia
        </p>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate(shiftDate(date, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate(shiftDate(date, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(getTodayString())}
        >
          Hoje
        </Button>
      </div>

      <p className="text-sm font-medium capitalize">{formatDateDisplay(date)}</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            Nenhum atendimento nesta data
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                      </span>
                      <Badge variant={STATUS_VARIANTS[apt.status]}>
                        {STATUS_LABELS[apt.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {apt.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="h-3.5 w-3.5" />
                        {apt.serviceName}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {apt.serviceDuration} min •{' '}
                      {formatCurrency(apt.servicePrice)}
                    </p>
                    {apt.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Obs: {apt.notes}
                      </p>
                    )}
                  </div>

                  {apt.status === 'SCHEDULED' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusChange(apt, 'COMPLETED')}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Realizado
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusChange(apt, 'NO_SHOW')}
                        className="gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Não veio
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusChange(apt, 'CANCELLED')}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status change confirmation dialog */}
      <Dialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Status</DialogTitle>
            <DialogDescription>
              Alterar o atendimento de{' '}
              <span className="font-medium">{statusTarget?.appointment.customerName}</span>
              {' '}({statusTarget?.appointment.serviceName}) para{' '}
              <span className="font-medium">
                {statusTarget && STATUS_LABELS[statusTarget.newStatus]}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              Voltar
            </Button>
            <Button
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
              variant={statusTarget?.newStatus === 'CANCELLED' ? 'destructive' : 'default'}
            >
              {statusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
