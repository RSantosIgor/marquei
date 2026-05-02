# Backend — NestJS Guidelines

## Structure

```
backend/src/
├── auth/              # AuthModule: login, register, JWT, guards
├── users/             # UsersModule: user CRUD
├── services/          # ServicesModule: salon services CRUD
├── professionals/     # ProfessionalsModule: professionals, schedules, linked services
├── customers/         # CustomersModule: customer CRUD
├── appointments/      # AppointmentsModule: booking, availability, status
├── notifications/     # NotificationsModule: BullMQ workers, notification records
├── imports/           # ImportsModule: CSV/Excel upload, async processing
├── dashboard/         # DashboardModule: aggregated stats for managers
├── common/            # Shared: guards, decorators, pipes, filters, interceptors
└── prisma/            # PrismaModule: PrismaService wrapping PrismaClient
```

## Rules

1. **Thin controllers:** Controllers parse requests and return responses. All business logic goes in services.
2. **DTOs:** Every endpoint uses validated DTOs with `class-validator` decorators. Never pass raw `req.body`.
3. **Prisma transactions:** Use `prisma.$transaction()` for operations that touch multiple tables or need atomicity.
4. **Error handling:** Throw NestJS built-in exceptions (`NotFoundException`, `ConflictException`, etc.). The global exception filter handles formatting.
5. **Guards:** Apply `JwtAuthGuard` globally. Use `@Public()` for open routes. Use `@Roles('MANAGER')` for restricted routes.
6. **Pagination:** All list endpoints support `?page=&limit=` with default limit=20, max limit=100. Return `{ data, meta: { total, page, limit, totalPages } }`.
7. **Naming:** Files follow NestJS conventions: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`, `*.guard.ts`.
8. **Testing:** Unit tests in `*.spec.ts` next to source files. Use `@nestjs/testing` for module setup. Mock Prisma with manual mocks.
9. **Config:** Use `@nestjs/config` with `registerAs()`. Access via `ConfigService`, never `process.env` directly.
10. **BullMQ:** Each queue has its own processor class. Jobs must be idempotent. Use unique job IDs where applicable.

## Key Patterns

### Double-booking prevention
```typescript
// In AppointmentsService.create():
await prisma.$transaction(async (tx) => {
  // 1. Lock the professional's slots with FOR UPDATE
  // 2. Check for overlapping appointments
  // 3. Create the appointment
  // PostgreSQL exclusion constraint is the safety net
});
```

### Notification dispatch
```typescript
// After creating appointment, emit event:
this.notificationsQueue.add('send-notification', {
  appointmentId,
  type: 'CONFIRMATION',
}, { jobId: `${appointmentId}-CONFIRMATION` }); // idempotent
```

## Database

- Schema defined in `prisma/schema.prisma`
- Enums: Role, AppointmentStatus, NotificationType, ImportStatus, ImportRowStatus
- Extension: `btree_gist` for exclusion constraints
- Always run `npx prisma generate` after schema changes
