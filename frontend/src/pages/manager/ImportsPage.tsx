import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { importsService } from '@/services/imports.service'
import type { ImportJob, ImportStatus } from '@/types/import'

const STATUS_LABELS: Record<ImportStatus, string> = {
  QUEUED: 'Na fila',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluído',
  COMPLETED_WITH_ERRORS: 'Concluído c/ erros',
  FAILED: 'Falhou',
}

const STATUS_VARIANTS: Record<
  ImportStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  QUEUED: 'outline',
  PROCESSING: 'default',
  COMPLETED: 'secondary',
  COMPLETED_WITH_ERRORS: 'default',
  FAILED: 'destructive',
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ImportsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [detailJobId, setDetailJobId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { data: jobsRes, isLoading } = useQuery({
    queryKey: ['import-jobs', page],
    queryFn: () => importsService.getAll({ page, limit: 20 }),
    refetchInterval: 5_000,
  })

  const { data: detailRes } = useQuery({
    queryKey: ['import-job-detail', detailJobId],
    queryFn: () => importsService.getOne(detailJobId!),
    enabled: !!detailJobId,
    refetchInterval: detailJobId ? 3_000 : false,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => importsService.upload(file),
    onSuccess: () => {
      toast.success('Arquivo enviado! Importação iniciada.')
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao enviar arquivo')
    },
  })

  const jobs: ImportJob[] = jobsRes?.data?.data ?? []
  const meta = jobsRes?.data?.meta
  const detail = detailRes?.data?.data

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Apenas arquivos CSV ou XLSX são aceitos')
      return
    }
    uploadMutation.mutate(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importação em Massa</h1>
        <p className="text-sm text-muted-foreground">
          Importe clientes via CSV ou XLSX
        </p>
      </div>

      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 sm:p-8 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploadMutation.isPending
                  ? 'Enviando...'
                  : 'Clique ou arraste o arquivo aqui'}
              </p>
              <p className="text-xs text-muted-foreground">CSV ou XLSX • máx 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={handleInputChange}
              disabled={uploadMutation.isPending}
            />
          </div>
          <div className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium">Formato esperado (clientes):</p>
            <p className="mt-1 font-mono">name,email,phone</p>
            <p className="font-mono">João Silva,joao@example.com,11999999999</p>
            <p className="mt-1">
              Campos obrigatórios: <strong>name</strong>, <strong>email</strong>. Senha padrão: <strong>Importado@123</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Jobs list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico de importações</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhuma importação ainda</p>
          </div>
        ) : (
          <>
            {jobs.map((job) => (
              <Card key={job.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setDetailJobId(job.id)}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{job.fileName}</span>
                        <Badge variant={STATUS_VARIANTS[job.status]}>
                          {STATUS_LABELS[job.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(job.createdAt)}
                      </p>
                    </div>

                    {job.totalRows > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {job.successRows}
                        </span>
                        {job.errorRows > 0 && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {job.errorRows}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          / {job.totalRows} linhas
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPage((p) => p - 1)
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation()
                    setPage((p) => p + 1)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailJobId} onOpenChange={(open) => { if (!open) setDetailJobId(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da importação</DialogTitle>
          </DialogHeader>

          {!detail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Arquivo</p>
                  <p className="font-medium">{detail.fileName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={STATUS_VARIANTS[detail.status]}>
                    {STATUS_LABELS[detail.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Total de linhas</p>
                  <p className="font-medium">{detail.totalRows}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resultado</p>
                  <p className="font-medium text-green-600">{detail.successRows} ok</p>
                  {detail.errorRows > 0 && (
                    <p className="font-medium text-destructive">{detail.errorRows} erros</p>
                  )}
                </div>
              </div>

              {detail.rows.filter((r) => r.status === 'ERROR').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-destructive">
                    Linhas com erro
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {detail.rows
                      .filter((r) => r.status === 'ERROR')
                      .map((r) => (
                        <div
                          key={r.id}
                          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
                        >
                          <p className="font-medium">
                            Linha {r.rowNumber}
                          </p>
                          <p className="text-destructive text-xs mt-0.5">
                            {r.errorMessage}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1 font-mono">
                            {JSON.stringify(r.rawData)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
