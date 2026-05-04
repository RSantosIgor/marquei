import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import { authService } from '@/services/auth.service'
import { getApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { getRoleRedirect } from '@/lib/role-redirect'
import { Mail, Lock, User, Phone, CalendarCheck, Clock, Users, Loader2 } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: RegisterForm) {
    setLoading(true)
    try {
      const { data } = await authService.register({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
      })
      const { user, accessToken, refreshToken } = data.data
      setAuth(user, accessToken, refreshToken)
      toast.success('Conta criada com sucesso!')
      navigate(getRoleRedirect(user.role))
    } catch (err) {
      toast.error(getApiError(err, 'Erro ao criar conta'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marquei</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">Agendamento inteligente</p>
        </div>

        <div className="space-y-8">
          <h2 className="text-4xl font-bold leading-tight">
            Comece a agendar<br />em minutos
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/80">
            Crie sua conta e agende seus horários favoritos com praticidade e rapidez.
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
              <CalendarCheck className="h-5 w-5 shrink-0" />
              <span className="text-sm">Agende de qualquer lugar</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Clock className="h-5 w-5 shrink-0" />
              <span className="text-sm">Lembretes automáticos</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Users className="h-5 w-5 shrink-0" />
              <span className="text-sm">Seus profissionais favoritos</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-primary-foreground/50">
          &copy; {new Date().getFullYear()} Marquei. Todos os direitos reservados.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile brand */}
          <div className="text-center lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight">Marquei</h1>
            <p className="mt-1 text-sm text-muted-foreground">Agendamento inteligente</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Crie sua conta</h2>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para começar
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Nome completo</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="Maria Silva"
                        className="pl-10"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>
                      Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
                    </FieldLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="(11) 99999-0000"
                        className="pl-10"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                  </Field>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          id={field.name}
                          type="password"
                          placeholder="Min. 6 caracteres"
                          className="pl-10"
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Confirmar</FieldLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          id={field.name}
                          type="password"
                          placeholder="Repita a senha"
                          className="pl-10"
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            </FieldGroup>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
