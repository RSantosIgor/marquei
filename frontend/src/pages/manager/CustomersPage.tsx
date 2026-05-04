import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { customersService } from '@/services/customers.service'
import type { Customer } from '@/types/customer'
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react'

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

export function CustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersService.getAll({ search: search || undefined, page, limit: 20 }),
    select: (res) => res.data,
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => customersService.create(data),
    onSuccess: () => {
      toast.success('Cliente criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao criar cliente')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) =>
      customersService.update(id, data),
    onSuccess: () => {
      toast.success('Cliente atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditing(null)
      editForm.reset()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao atualizar cliente')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess: () => {
      toast.success('Cliente desativado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao desativar cliente')
    },
  })

  function openCreate() {
    createForm.reset({ name: '', email: '', password: '', phone: '', notes: '' })
    setCreateOpen(true)
  }

  function openEdit(customer: Customer) {
    editForm.reset({
      name: customer.name,
      phone: customer.phone || '',
      notes: customer.notes || '',
    })
    setEditing(customer)
  }

  function onCreateSubmit(values: CreateForm) {
    createMutation.mutate(values)
  }

  function onEditSubmit(values: EditForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values })
    }
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os clientes do seu estabelecimento
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
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
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{customer.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {customer.phone || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.active ? 'default' : 'secondary'}>
                      {customer.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(customer)}
                        disabled={!customer.active}
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
            {data.meta.total} cliente(s) encontrado(s)
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
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente no sistema
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input id="create-name" placeholder="Nome completo" {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-email">E-mail</Label>
                <Input id="create-email" type="email" placeholder="email@exemplo.com" {...createForm.register('email')} />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Telefone</Label>
                <Input id="create-phone" placeholder="(11) 99999-0000" {...createForm.register('phone')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha</Label>
              <Input id="create-password" type="password" placeholder="Min. 6 caracteres" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes">Observações</Label>
              <Input id="create-notes" placeholder="Observações sobre o cliente" {...createForm.register('notes')} />
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
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input id="edit-phone" placeholder="(11) 99999-0000" {...editForm.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Input id="edit-notes" placeholder="Observações sobre o cliente" {...editForm.register('notes')} />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar o cliente "{deleteTarget?.name}"? Ele não
              poderá mais fazer login ou agendar horários.
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
    </div>
  )
}
