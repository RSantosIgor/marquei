import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TimePicker } from '@/components/TimePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { professionalsService } from '@/services/professionals.service'
import { servicesService } from '@/services/services.service'
import type { Professional, WorkScheduleEntry } from '@/types/professional'
import type { Service } from '@/types/service'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Scissors,
  X,
} from 'lucide-react'

const DAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
]

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional(),
  specialty: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z.string().optional(),
  specialty: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

interface ScheduleEntry {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export function ProfessionalsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Professional | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<Professional | null>(null)
  const [servicesTarget, setServicesTarget] = useState<Professional | null>(null)

  // Schedule editor state
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([])

  // Services selector state
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['professionals', search, page],
    queryFn: () =>
      professionalsService.getAll({ search: search || undefined, page, limit: 20 }),
    select: (res) => res.data,
  })

  // Fetch all active services for the service selector
  const { data: allServices } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: () => servicesService.getAll({ limit: 100 }),
    select: (res) => res.data.data.filter((s: Service) => s.active),
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', phone: '', specialty: '' },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', phone: '', specialty: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => professionalsService.create(data),
    onSuccess: () => {
      toast.success('Profissional criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao criar profissional')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) =>
      professionalsService.update(id, data),
    onSuccess: () => {
      toast.success('Profissional atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      setEditing(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao atualizar profissional')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => professionalsService.remove(id),
    onSuccess: () => {
      toast.success('Profissional desativado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao desativar profissional')
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: ({ id, entries }: { id: string; entries: ScheduleEntry[] }) =>
      professionalsService.setSchedule(id, { entries }),
    onSuccess: () => {
      toast.success('Jornada atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      setScheduleTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao atualizar jornada')
    },
  })

  const servicesMutation = useMutation({
    mutationFn: ({ id, serviceIds }: { id: string; serviceIds: string[] }) =>
      professionalsService.linkServices(id, { serviceIds }),
    onSuccess: () => {
      toast.success('Serviços vinculados com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      setServicesTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao vincular serviços')
    },
  })

  function openCreate() {
    createForm.reset({ name: '', email: '', password: '', phone: '', specialty: '' })
    setCreateOpen(true)
  }

  function openEdit(professional: Professional) {
    editForm.reset({
      name: professional.name,
      phone: professional.phone || '',
      specialty: professional.specialty || '',
    })
    setEditing(professional)
  }

  function openSchedule(professional: Professional) {
    setScheduleEntries(
      professional.workSchedules.map((ws) => ({
        dayOfWeek: ws.dayOfWeek,
        startTime: ws.startTime,
        endTime: ws.endTime,
      })),
    )
    setScheduleTarget(professional)
  }

  function openServices(professional: Professional) {
    setSelectedServiceIds(professional.services.map((s) => s.id))
    setServicesTarget(professional)
  }

  function addScheduleEntry() {
    setScheduleEntries((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
    ])
  }

  function removeScheduleEntry(index: number) {
    setScheduleEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function updateScheduleEntry(index: number, field: keyof ScheduleEntry, value: string | number) {
    setScheduleEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    )
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    )
  }

  function formatScheduleSummary(schedules: WorkScheduleEntry[]) {
    if (schedules.length === 0) return 'Sem jornada'
    const days = [...new Set(schedules.map((s) => s.dayOfWeek))].sort()
    return days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ')
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os profissionais, jornadas e serviços vinculados
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Profissional
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar profissionais..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">E-mail</TableHead>
              <TableHead className="hidden md:table-cell">Especialidade</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead className="hidden sm:table-cell">Serviços</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum profissional encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((prof) => (
                <TableRow key={prof.id}>
                  <TableCell className="font-medium">{prof.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{prof.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {prof.specialty || '—'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => openSchedule(prof)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Clock className="h-3 w-3" />
                      {formatScheduleSummary(prof.workSchedules)}
                    </button>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <button
                      onClick={() => openServices(prof)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Scissors className="h-3 w-3" />
                      {prof.services.length} serviço(s)
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={prof.active ? 'default' : 'secondary'}>
                      {prof.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(prof)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={() => openServices(prof)}
                      >
                        <Scissors className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(prof)}
                        disabled={!prof.active}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.meta.total} profissional(is) encontrado(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              {page} de {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Profissional</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo profissional
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome completo</Label>
              <Input id="create-name" placeholder="Ex: João Silva" {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">E-mail</Label>
              <Input id="create-email" type="email" placeholder="joao@email.com" {...createForm.register('email')} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha</Label>
              <Input id="create-password" type="password" placeholder="Min. 6 caracteres" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Telefone</Label>
                <Input id="create-phone" placeholder="(11) 99999-0000" {...createForm.register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-specialty">Especialidade</Label>
                <Input id="create-specialty" placeholder="Ex: Cortes" {...createForm.register('specialty')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
            <DialogDescription>Atualize as informações do profissional</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((values) =>
              editing && updateMutation.mutate({ id: editing.id, data: values }),
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input id="edit-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input id="edit-phone" placeholder="(11) 99999-0000" {...editForm.register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-specialty">Especialidade</Label>
                <Input id="edit-specialty" placeholder="Ex: Cortes" {...editForm.register('specialty')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar profissional</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar "{deleteTarget?.name}"? Ele não poderá
              receber novos agendamentos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desativando...
                </>
              ) : (
                'Desativar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Editor Dialog */}
      <Dialog open={!!scheduleTarget} onOpenChange={() => setScheduleTarget(null)} modal={false}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Jornada de {scheduleTarget?.name}</DialogTitle>
            <DialogDescription>
              Defina os horários de trabalho para cada dia da semana
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {scheduleEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum horário cadastrado. Clique em "Adicionar" para começar.
              </p>
            )}
            {scheduleEntries.map((entry, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(entry.dayOfWeek)}
                  onValueChange={(value) => updateScheduleEntry(index, 'dayOfWeek', parseInt(value))}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((name, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TimePicker
                  value={entry.startTime}
                  onChange={(v) => updateScheduleEntry(index, 'startTime', v)}
                />
                <span className="text-sm text-muted-foreground">às</span>
                <TimePicker
                  value={entry.endTime}
                  onChange={(v) => updateScheduleEntry(index, 'endTime', v)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeScheduleEntry(index)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addScheduleEntry}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar horário
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={scheduleMutation.isPending}
              onClick={() =>
                scheduleTarget &&
                scheduleMutation.mutate({
                  id: scheduleTarget.id,
                  entries: scheduleEntries,
                })
              }
            >
              {scheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar jornada'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Services Selector Dialog */}
      <Dialog open={!!servicesTarget} onOpenChange={() => setServicesTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Serviços de {servicesTarget?.name}</DialogTitle>
            <DialogDescription>
              Selecione os serviços que este profissional executa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {!allServices || allServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum serviço ativo encontrado. Cadastre serviços primeiro.
              </p>
            ) : (
              allServices.map((service: Service) => {
                const isSelected = selectedServiceIds.includes(service.id)
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                      }`}
                  >
                    <div>
                      <span className="font-medium">{service.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {service.duration} min
                      </span>
                    </div>
                    <Badge variant={isSelected ? 'default' : 'outline'}>
                      {isSelected ? 'Vinculado' : 'Vincular'}
                    </Badge>
                  </button>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServicesTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={servicesMutation.isPending}
              onClick={() =>
                servicesTarget &&
                servicesMutation.mutate({
                  id: servicesTarget.id,
                  serviceIds: selectedServiceIds,
                })
              }
            >
              {servicesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                `Salvar (${selectedServiceIds.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
