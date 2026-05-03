import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { ServicesPage } from '@/pages/manager/ServicesPage'
import { CustomersPage } from '@/pages/manager/CustomersPage'
import { useAuthStore } from '@/stores/auth.store'
import { getRoleRedirect } from '@/lib/role-redirect'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getRoleRedirect(user.role)} replace />
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">Em construção</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Manager routes */}
          <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<PlaceholderPage title="Painel do Gestor" />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="appointments" element={<PlaceholderPage title="Agendamentos" />} />
            </Route>
          </Route>

          {/* Professional routes */}
          <Route element={<ProtectedRoute allowedRoles={['PROFESSIONAL']} />}>
            <Route path="/professional" element={<PlaceholderPage title="Painel do Profissional" />} />
          </Route>

          {/* Client routes */}
          <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
            <Route path="/customer" element={<PlaceholderPage title="Painel do Cliente" />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
