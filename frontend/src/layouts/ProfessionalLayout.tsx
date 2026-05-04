import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth.store'
import { CalendarDays, Menu, LogOut } from 'lucide-react'

const navItems = [
  { to: '/professional', icon: CalendarDays, label: 'Minha Agenda', end: true },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">Marquei</h1>
        <p className="text-xs text-muted-foreground">Painel do Profissional</p>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}

export function ProfessionalLayout() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-card lg:block">
        <NavContent />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold">Marquei</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
