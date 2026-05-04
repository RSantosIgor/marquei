import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/DatePicker'
import { appointmentsService } from '@/services/appointments.service'
import type { Appointment } from '@/types/appointment'
import {
  CalendarDays,
  Clock,
  Scissors,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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

export function MyAppointmentsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newSlot, setNewSlot] = useState('')

  const { data: appointmentsRes, isLoading } = useQuery({
    queryKey: ['my-appointments', page],
    queryFn: () => appointmentsService.getMyAppointments({ page, limit: 50 }),
  })

  const { data: slotsRes, isLoading: loadingSlots } = useQuery({
    queryKey: [
      'reschedule-availability',
      rescheduleTarget?.professionalId,
      rescheduleTarget?.serviceId,
      newDate,
    ],
    queryFn: () =>
      appointmentsService.getAvailability({
        professionalId: rescheduleTarget!.professionalId,
        serviceId: rescheduleTarget!.serviceId,
        date: newDate,
      }),
    enabled: !!rescheduleTarget && !!newDate,
  })

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      appointmentsService.reschedule(rescheduleTarget!.id, {
        startTime: `${newDate}T${newSlot}:00.000Z`,
      }),
    onSuccess: () => {
      toast.success('Agendamento remarcado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      closeRescheduleDialog()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao remarcar')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => appointmentsService.cancel(cancelTarget!.id),
    onSuccess: () => {
      toast.success('Agendamento cancelado')
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      setCancelTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao cancelar')
    },
  })

  const allAppointments = appointmentsRes?.data?.data ?? []
  const meta = appointmentsRes?.data?.meta
  const slots = slotsRes?.data?.data?.slots ?? []

  const now = new Date().toISOString()
  const upcoming = allAppointments.filter(
    (a) => a.status === 'SCHEDULED' && a.startTime > now,
  )
  const past = allAppointments.filter(
    (a) => a.status !== 'SCHEDULED' || a.startTime <= now,
  )

  function openReschedule(apt: Appointment) {
    setRescheduleTarget(apt)
    setNewDate('')
    setNewSlot('')
  }

  function closeRescheduleDialog() {
    setRescheduleTarget(null)
    setNewDate('')
    setNewSlot('')
  }

  function getTodayString() {
    return new Date().toISOString().split('T')[0]
  }

  function renderAppointmentCard(apt: Appointment, showActions: boolean) {
    return (
      <Card key={apt.id}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{apt.serviceName}</span>
                <Badge variant={STATUS_VARIANTS[apt.status]}>
                  {STATUS_LABELS[apt.status]}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  {apt.professionalName}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(apt.startTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {apt.serviceDuration} min •{' '}
                {formatCurrency(apt.servicePrice)}
              </p>
            </div>

            {showActions && apt.status === 'SCHEDULED' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openReschedule(apt)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Remarcar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelTarget(apt)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cancelar</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderEmpty(message: string) {
    return (
      <div className="py-12 text-center">
        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe e gerencie seus agendamentos
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Próximos ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Histórico ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {upcoming.length === 0 ? (
              renderEmpty('Nenhum agendamento futuro')
            ) : (
              <div className="space-y-3">
                {upcoming.map((apt) => renderAppointmentCard(apt, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {past.length === 0 ? (
              renderEmpty('Nenhum agendamento no histórico')
            ) : (
              <div className="space-y-3">
                {past.map((apt) => renderAppointmentCard(apt, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reschedule Dialog */}
      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => {
          if (!open) closeRescheduleDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remarcar Agendamento</DialogTitle>
            <DialogDescription>
              Escolha uma nova data e horário para{' '}
              <span className="font-medium">
                {rescheduleTarget?.serviceName}
              </span>{' '}
              com{' '}
              <span className="font-medium">
                {rescheduleTarget?.professionalName}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova data</Label>
              <DatePicker
                value={newDate || undefined}
                onChange={(v) => {
                  setNewDate(v)
                  setNewSlot('')
                }}
                minDate={getTodayString()}
                placeholder="Selecione a data"
              />
            </div>

            {newDate && (
              <div className="space-y-2">
                <Label>Horário disponível</Label>
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário disponível nesta data
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <Button
                        key={slot}
                        variant={newSlot === slot ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewSlot(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRescheduleDialog}>
              Cancelar
            </Button>
            <Button
              onClick={() => rescheduleMutation.mutate()}
              disabled={!newSlot || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar o agendamento de{' '}
              <span className="font-medium">{cancelTarget?.serviceName}</span>{' '}
              em{' '}
              <span className="font-medium">
                {cancelTarget && formatDate(cancelTarget.startTime)}
              </span>{' '}
              às{' '}
              <span className="font-medium">
                {cancelTarget && formatTime(cancelTarget.startTime)}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O cancelamento só é permitido com pelo menos 24h de antecedência.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cancelar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
