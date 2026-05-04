import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/DatePicker'
import { appointmentsService } from '@/services/appointments.service'
import type { Service } from '@/types/service'
import type { AvailableProfessional } from '@/types/appointment'
import {
  Scissors,
  UserCheck,
  CalendarDays,
  Clock,
  Check,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

type Step = 'service' | 'professional' | 'date' | 'time' | 'confirm'

const STEP_ORDER: Step[] = ['service', 'professional', 'date', 'time', 'confirm']

const STEP_LABELS: Record<Step, string> = {
  service: 'Serviço',
  professional: 'Profissional',
  date: 'Data',
  time: 'Horário',
  confirm: 'Confirmação',
}

const STEP_ICONS: Record<Step, React.ElementType> = {
  service: Scissors,
  professional: UserCheck,
  date: CalendarDays,
  time: Clock,
  confirm: Check,
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value))
}

function getTodayString() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export function NewAppointmentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] =
    useState<AvailableProfessional | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')

  const currentIndex = STEP_ORDER.indexOf(step)

  const { data: servicesRes, isLoading: loadingServices } = useQuery({
    queryKey: ['booking', 'services'],
    queryFn: () => appointmentsService.getAvailableServices(),
  })

  const { data: professionalsRes, isLoading: loadingProfessionals } = useQuery({
    queryKey: ['booking', 'professionals', selectedService?.id],
    queryFn: () =>
      appointmentsService.getProfessionalsForService(selectedService!.id),
    enabled: !!selectedService,
  })

  const { data: availabilityRes, isLoading: loadingSlots } = useQuery({
    queryKey: [
      'booking',
      'availability',
      selectedProfessional?.id,
      selectedService?.id,
      selectedDate,
    ],
    queryFn: () =>
      appointmentsService.getAvailability({
        professionalId: selectedProfessional!.id,
        serviceId: selectedService!.id,
        date: selectedDate,
      }),
    enabled: !!selectedProfessional && !!selectedService && !!selectedDate,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      appointmentsService.create({
        professionalId: selectedProfessional!.id,
        serviceId: selectedService!.id,
        startTime: `${selectedDate}T${selectedSlot}:00.000Z`,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Agendamento realizado com sucesso!')
      navigate('/customer/appointments')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao agendar')
    },
  })

  const services = servicesRes?.data?.data ?? []
  const professionals = professionalsRes?.data?.data ?? []
  const slots = availabilityRes?.data?.data?.slots ?? []

  function goBack() {
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1])
    }
  }

  function selectService(service: Service) {
    setSelectedService(service)
    setSelectedProfessional(null)
    setSelectedDate('')
    setSelectedSlot('')
    setStep('professional')
  }

  function selectProfessional(professional: AvailableProfessional) {
    setSelectedProfessional(professional)
    setSelectedDate('')
    setSelectedSlot('')
    setStep('date')
  }

  function selectDate(date: string) {
    setSelectedDate(date)
    setSelectedSlot('')
    setStep('time')
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot)
    setStep('confirm')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos para agendar seu horário
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_ORDER.map((s, i) => {
          const Icon = STEP_ICONS[s]
          const isActive = i === currentIndex
          const isDone = i < currentIndex
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-6 ${isDone ? 'bg-primary' : 'bg-border'}`}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isDone
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`hidden text-xs sm:inline ${
                  isActive ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Back button */}
      {currentIndex > 0 && (
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      )}

      {/* Step: Service */}
      {step === 'service' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Escolha o serviço</h2>
          {loadingServices ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : services.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum serviço disponível
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className="cursor-pointer transition-colors hover:border-primary"
                  onClick={() => selectService(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.duration} min
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatCurrency(service.price)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Professional */}
      {step === 'professional' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Escolha o profissional</h2>
          <p className="text-sm text-muted-foreground">
            Profissionais que realizam:{' '}
            <span className="font-medium text-foreground">
              {selectedService?.name}
            </span>
          </p>
          {loadingProfessionals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : professionals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum profissional disponível para este serviço
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {professionals.map((prof) => (
                <Card
                  key={prof.id}
                  className="cursor-pointer transition-colors hover:border-primary"
                  onClick={() => selectProfessional(prof)}
                >
                  <CardContent className="p-4">
                    <p className="font-medium">{prof.name}</p>
                    {prof.specialty && (
                      <p className="text-sm text-muted-foreground">
                        {prof.specialty}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Date */}
      {step === 'date' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Escolha a data</h2>
          <p className="text-sm text-muted-foreground">
            Profissional:{' '}
            <span className="font-medium text-foreground">
              {selectedProfessional?.name}
            </span>
          </p>
          <div className="max-w-xs space-y-1">
            <Label>Data</Label>
            <DatePicker
              value={selectedDate || undefined}
              onChange={(v) => { if (v) selectDate(v) }}
              minDate={getTodayString()}
              placeholder="Selecione a data"
            />
          </div>
        </div>
      )}

      {/* Step: Time */}
      {step === 'time' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Escolha o horário</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <div className="space-y-3">
              <p className="py-8 text-center text-muted-foreground">
                Nenhum horário disponível nesta data
              </p>
              <Button variant="outline" onClick={goBack}>
                Escolher outra data
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {slots.map((slot) => (
                <Button
                  key={slot}
                  variant="outline"
                  className="h-12"
                  onClick={() => selectSlot(slot)}
                >
                  {slot}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Confirme seu agendamento</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissional</span>
                <span className="font-medium">
                  {selectedProfessional?.name}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString(
                    'pt-BR',
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">{selectedSlot}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração</span>
                <span className="font-medium">
                  {selectedService?.duration} min
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-medium">
                  {formatCurrency(selectedService?.price ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input
              id="notes"
              placeholder="Ex: Tenho alergia a determinado produto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Agendando...
              </>
            ) : (
              'Confirmar Agendamento'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
