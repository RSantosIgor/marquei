# Frontend — React + Vite Guidelines

## Structure

```
frontend/src/
├── components/        # Reusable UI components (shadcn/ui wrappers + custom)
│   └── ui/            # shadcn/ui generated components (do not edit manually)
├── pages/             # Route pages organized by profile
│   ├── auth/          # /login, /register
│   ├── manager/       # /manager/*
│   ├── professional/  # /professional/*
│   └── customer/      # /customer/*
├── layouts/           # ManagerLayout, ProfessionalLayout, ClientLayout
├── hooks/             # Custom React hooks
├── services/          # API call functions (axios instances)
├── stores/            # Zustand stores (auth, ui)
├── lib/               # Utilities, helpers, constants
│   ├── api.ts         # Axios instance with interceptors
│   └── utils.ts       # shadcn/ui cn() utility
└── types/             # Shared TypeScript interfaces
```

## Rules

1. **shadcn/ui first:** Always use shadcn/ui components as base. Don't create custom buttons, inputs, dialogs, etc.
2. **Tailwind CSS only:** No CSS modules, no styled-components. Use Tailwind utility classes.
3. **Server state:** Use TanStack Query (`@tanstack/react-query`) for all API data. Define query keys consistently.
4. **Client state:** Use Zustand only for auth and UI state (sidebar open, theme). Never duplicate server state in Zustand.
5. **API calls:** All API functions live in `src/services/`. Each module has its own file (e.g., `appointments.service.ts`).
6. **Forms:** Use `react-hook-form` + `zod` for form validation. Every form has a Zod schema.
7. **Routing:** React Router v6 with layout routes. Protected routes check auth + role.
8. **Responsiveness:** Design mobile-first. Test at 375px, 768px, 1024px, 1440px.
9. **Language:** All user-facing text in Portuguese (pt-BR). Code in English.
10. **Components:** Functional components only. Use TypeScript interfaces for props. Export as named exports.
11. **File naming:** PascalCase for components (`AppointmentCard.tsx`), camelCase for utilities (`formatDate.ts`).
12. **Toasts:** Use Sonner (`sonner`) for all success/error notifications.

## Key Patterns

### API Service
```typescript
// src/services/appointments.service.ts
import { api } from '@/lib/api';

export const appointmentsService = {
  getAvailability: (params: AvailabilityParams) =>
    api.get('/appointments/availability', { params }),
  create: (data: CreateAppointmentDto) =>
    api.post('/appointments', data),
};
```

### Query Hook
```typescript
// src/hooks/useAppointments.ts
export function useAvailability(params: AvailabilityParams) {
  return useQuery({
    queryKey: ['availability', params],
    queryFn: () => appointmentsService.getAvailability(params),
    enabled: !!params.professionalId && !!params.serviceId && !!params.date,
  });
}
```

### Protected Route
```typescript
// Check role and redirect if unauthorized
<Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
  <Route path="/manager" element={<ManagerLayout />}>
    <Route index element={<ManagerDashboard />} />
  </Route>
</Route>
```

## shadcn/ui Components Used

Button, Input, Select, Dialog, Table, Card, Badge, Calendar, Form, Toast/Sonner, Tabs, DropdownMenu, Sheet, Label, Separator, Skeleton, Avatar, Popover, Command
