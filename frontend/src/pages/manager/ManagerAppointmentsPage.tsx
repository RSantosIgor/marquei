import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePicker } from '@/components/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { appointmentsService } from '@/services/appointments.service'
import { professionalsService } from '@/services/professionals.service'
import { customersService } from '@/services/customers.service'
import { getApiError } from '@/lib/api'
import type { Appointment, AppointmentStatus } from '@/types/appointment'
import {
  CalendarDays,
  Clock,
  Scissors,
  User,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Ban,
  Download,
  History,
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

function getFirstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
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

function exportCsv(appointments: Appointment[]) {
  const headers = ['Data', 'Horário', 'Cliente', 'Profissional', 'Serviço', 'Duração (min)', 'Valor', 'Status']
  const rows = appointments.map((a) => [
    formatDate(a.startTime),
    formatTime(a.startTime),
    a.customerName ?? '',
    a.professionalName ?? '',
    a.serviceName ?? '',
    String(a.serviceDuration ?? ''),
    String(a.servicePrice ?? ''),
    STATUS_LABELS[a.status] ?? a.status,
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `historico-agendamentos-${getTodayString()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Day view ──────────────────────────────────────────────────────────────

function DayView() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(getTodayString())
  const [professionalId, setProfessionalId] = useState<string>('__all__')
  const [statusFilter, setStatusFilter] = useState<string>('__all__')
  const [page, setPage] = useState(1)
  const [statusTarget, setStatusTarget] = useState<{
    appointment: Appointment
    newStatus: AppointmentStatus
  } | null>(null)

  const { data: professionalsRes } = useQuery({
    queryKey: ['manager-professionals-list'],
    queryFn: () => professionalsService.getAll({ limit: 100 }),
  })

  const { data: appointmentsRes, isLoading } = useQuery({
    queryKey: ['manager-appointments', date, professionalId, statusFilter, page],
    queryFn: () =>
      appointmentsService.getAll({
        date: date || undefined,
        professionalId: professionalId === '__all__' ? undefined : professionalId,
        status: statusFilter === '__all__' ? undefined : (statusFilter as AppointmentStatus),
        page,
        limit: 20,
      }),
  })

  const statusMutation = useMutation({
    mutationFn: () =>
      appointmentsService.updateStatus(
        statusTarget!.appointment.id,
        statusTarget!.newStatus,
      ),
    onSuccess: () => {
      toast.success(`Status alterado para "${STATUS_LABELS[statusTarget!.newStatus]}"`)
      queryClient.invalidateQueries({ queryKey: ['manager-appointments'] })
      setStatusTarget(null)
    },
    onError: (err: unknown) => {
      toast.error(getApiError(err, 'Erro ao alterar status'))
    },
  })

  const professionals = professionalsRes?.data?.data ?? []
  const appointments = appointmentsRes?.data?.data ?? []
  const meta = appointmentsRes?.data?.meta

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <Label>Data</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => { setDate(shiftDate(date, -1)); setPage(1) }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DatePicker value={date} onChange={(v) => { setDate(v); setPage(1) }} className="w-full sm:w-[160px]" />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => { setDate(shiftDate(date, 1)); setPage(1) }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="shrink-0 ml-1" onClick={() => { setDate(getTodayString()); setPage(1) }}>
              Hoje
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Profissional</Label>
          <Select value={professionalId} onValueChange={(v) => { setProfessionalId(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm font-medium capitalize">{formatDateDisplay(date)}</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Nenhum agendamento encontrado</p>
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
                      <Badge variant={STATUS_VARIANTS[apt.status]}>{STATUS_LABELS[apt.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{apt.customerName}</span>
                      <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{apt.professionalName}</span>
                      <span className="flex items-center gap-1"><Scissors className="h-3.5 w-3.5" />{apt.serviceName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{apt.serviceDuration} min • {formatCurrency(apt.servicePrice)}</p>
                    {apt.notes && <p className="text-sm text-muted-foreground italic">Obs: {apt.notes}</p>}
                  </div>

                  {apt.status === 'SCHEDULED' && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setStatusTarget({ appointment: apt, newStatus: 'COMPLETED' })} className="gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Realizado</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setStatusTarget({ appointment: apt, newStatus: 'NO_SHOW' })} className="gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Não veio</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setStatusTarget({ appointment: apt, newStatus: 'CANCELLED' })} className="gap-1 text-destructive hover:text-destructive">
                        <Ban className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cancelar</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} de {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!statusTarget} onOpenChange={(open) => { if (!open) setStatusTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Status</DialogTitle>
            <DialogDescription>
              Alterar o atendimento de{' '}
              <span className="font-medium">{statusTarget?.appointment.customerName}</span>
              {' '}com{' '}
              <span className="font-medium">{statusTarget?.appointment.professionalName}</span>
              {' '}({statusTarget?.appointment.serviceName}) para{' '}
              <span className="font-medium">{statusTarget && STATUS_LABELS[statusTarget.newStatus]}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Voltar</Button>
            <Button
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
              variant={statusTarget?.newStatus === 'CANCELLED' ? 'destructive' : 'default'}
            >
              {statusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── History view ──────────────────────────────────────────────────────────

function HistoryView() {
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth())
  const [dateTo, setDateTo] = useState(getTodayString())
  const [professionalId, setProfessionalId] = useState<string>('__all__')
  const [customerId, setCustomerId] = useState<string>('__all__')
  const [statusFilter, setStatusFilter] = useState<string>('__all__')
  const [page, setPage] = useState(1)

  const { data: professionalsRes } = useQuery({
    queryKey: ['manager-professionals-list'],
    queryFn: () => professionalsService.getAll({ limit: 100 }),
  })

  const { data: customersRes } = useQuery({
    queryKey: ['manager-customers-list'],
    queryFn: () => customersService.getAll({ limit: 100 }),
  })

  const { data: historyRes, isLoading } = useQuery({
    queryKey: ['manager-history', dateFrom, dateTo, professionalId, customerId, statusFilter, page],
    queryFn: () =>
      appointmentsService.getHistory({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        professionalId: professionalId === '__all__' ? undefined : professionalId,
        customerId: customerId === '__all__' ? undefined : customerId,
        status: statusFilter === '__all__' ? undefined : (statusFilter as AppointmentStatus),
        page,
        limit: 20,
      }),
  })

  const professionals = professionalsRes?.data?.data ?? []
  const customers = customersRes?.data?.data ?? []
  const appointments = historyRes?.data?.data ?? []
  const meta = historyRes?.data?.meta

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <Label>De</Label>
          <DatePicker value={dateFrom || undefined} onChange={(v) => { setDateFrom(v); setPage(1) }} placeholder="Data inicial" />
        </div>

        <div className="space-y-1">
          <Label>Até</Label>
          <DatePicker value={dateTo || undefined} onChange={(v) => { setDateTo(v); setPage(1) }} placeholder="Data final" />
        </div>

        <div className="space-y-1">
          <Label>Profissional</Label>
          <Select value={professionalId} onValueChange={(v) => { setProfessionalId(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Cliente</Label>
          <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {appointments.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportCsv(appointments)} className="gap-2 self-end">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-12 text-center">
          <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Nenhum registro encontrado para os filtros selecionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meta && (
            <p className="text-sm text-muted-foreground">
              {meta.total} registro{meta.total !== 1 ? 's' : ''} encontrado{meta.total !== 1 ? 's' : ''}
            </p>
          )}
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatDate(apt.startTime)}</span>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{formatTime(apt.startTime)} – {formatTime(apt.endTime)}</span>
                    <Badge variant={STATUS_VARIANTS[apt.status]}>{STATUS_LABELS[apt.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{apt.customerName}</span>
                    <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{apt.professionalName}</span>
                    <span className="flex items-center gap-1"><Scissors className="h-3.5 w-3.5" />{apt.serviceName}</span>
                    <span>{formatCurrency(apt.servicePrice)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} de {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function ManagerAppointmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agendamentos</h1>
        <p className="text-sm text-muted-foreground">
          Visualize os agendamentos de todos os profissionais
        </p>
      </div>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">
            <CalendarDays className="mr-2 h-4 w-4" />
            Por dia
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-6 space-y-4">
          <DayView />
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          <HistoryView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
