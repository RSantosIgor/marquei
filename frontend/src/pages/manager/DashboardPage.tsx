import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/DatePicker'
import { dashboardService } from '@/services/dashboard.service'
import {
  CalendarDays,
  TrendingUp,
  DollarSign,
  UserX,
  Loader2,
  Trophy,
} from 'lucide-react'

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function getFirstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function getLastDayOfMonth() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

function getWeekEnd() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + 6
  const sun = new Date(new Date(d).setDate(diff))
  return `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateRange(from: string, to: string) {
  const fmt = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  return `${fmt(from)} – ${fmt(to)}`
}

type Preset = 'month' | 'week' | 'custom'

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().split('T')[0]
}

export function DashboardPage() {
  const [preset, setPreset] = useState<Preset>('month')
  const [customFrom, setCustomFrom] = useState(getFirstDayOfMonth())
  const [customTo, setCustomTo] = useState(getTodayString())

  const from =
    preset === 'month'
      ? getFirstDayOfMonth()
      : preset === 'week'
        ? getWeekStart()
        : customFrom

  const to =
    preset === 'month'
      ? getLastDayOfMonth()
      : preset === 'week'
        ? getWeekEnd()
        : customTo

  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['dashboard-stats', from, to],
    queryFn: () => dashboardService.getStats({ from, to }),
    staleTime: 5 * 60 * 1000,
  })

  const stats = statsRes?.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores operacionais do período selecionado
        </p>
      </div>

      {/* Period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex gap-2">
          {(['month', 'week', 'custom'] as Preset[]).map((p) => (
            <Button
              key={p}
              variant={preset === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset(p)}
            >
              {p === 'month' ? 'Este mês' : p === 'week' ? 'Esta semana' : 'Personalizado'}
            </Button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label>De</Label>
              <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="Data inicial" />
            </div>
            <div className="space-y-1">
              <Label>Até</Label>
              <DatePicker value={customTo} onChange={setCustomTo} placeholder="Data final" />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !stats ? null : (
        <>
          <p className="text-xs text-muted-foreground">
            Período: {formatDateRange(stats.period.from, stats.period.to)}
          </p>

          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de agendamentos</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalAppointments}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.completedAppointments} realizados · {stats.cancelledAppointments} cancelados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Faturamento estimado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(stats.estimatedRevenue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Baseado em atendimentos realizados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taxa de no-show</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.noShowRate}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Entre atendimentos concluídos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.occupancyByProfessional.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Profissional(is) com atendimentos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Occupancy by professional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atendimentos por profissional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.occupancyByProfessional.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados no período</p>
                ) : (
                  stats.occupancyByProfessional.map((entry, i) => {
                    const pct = stats.totalAppointments > 0
                      ? Math.round((entry.total / stats.totalAppointments) * 100)
                      : 0
                    return (
                      <div key={entry.professionalId}>
                        {i > 0 && <Separator className="mb-3" />}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{entry.professionalName}</span>
                          <span className="text-sm text-muted-foreground">{entry.total} ({pct}%)</span>
                        </div>
                        {/* Simple bar */}
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                          <span>{entry.completed} realizados</span>
                          <span>{entry.noShow} no-show</span>
                          <span>{entry.cancelled} cancelados</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Top services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Serviços mais agendados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados no período</p>
                ) : (
                  <ol className="space-y-2">
                    {stats.topServices.map((svc, i) => (
                      <li key={svc.serviceId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-sm">{svc.serviceName}</span>
                        </div>
                        <Badge variant="secondary">{svc.count}</Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
