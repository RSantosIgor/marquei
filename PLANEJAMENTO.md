# PLANEJAMENTO.md — Projeto Marquei

> Plataforma de agendamento online para salões de beleza e clínicas de estética.

---

## 1. Visão Geral

O **Marquei** substitui planilhas e telefonemas por um sistema online onde **clientes** agendam horários, **profissionais** gerenciam sua agenda e **gestores** administram toda a operação. Proteção contra double-booking, notificações assíncronas e importação em massa são pilares do sistema.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Banco | PostgreSQL 16 |
| ORM | Prisma |
| Fila | BullMQ |
| Cache/Broker | Redis 7 |
| Infra | Docker Compose |
| Testes | Jest (back) · Vitest (front) |

---

## 3. Decisões Técnicas

- **Auth:** JWT (access 15min + refresh 7d), bcrypt, RBAC com Guards NestJS.
- **Double-booking:** Transação Prisma com lock pessimista + exclusion constraint PostgreSQL (`btree_gist` + `tsrange`).
- **Notificações:** Eventos disparam jobs BullMQ; workers registram no banco. Idempotência por chave `(appointment_id, type)`. MVP simula envio.
- **Importação:** Upload → job BullMQ → processamento linha a linha. Falhas individuais não invalidam o lote.
- **Frontend:** React Router v6, TanStack Query (cache servidor), Zustand (auth/UI). Layouts por perfil.

### Entidades principais

```
User, Service, Professional, ProfessionalService, WorkSchedule,
Customer, Appointment, Notification, ImportJob, ImportJobRow
```

### Estrutura de pastas

```
marquei/
├── docker-compose.yml
├── frontend/src/{components,pages,layouts,hooks,services,stores,lib,types}
├── backend/src/{auth,users,services,professionals,customers,appointments,notifications,imports,dashboard,common,prisma}
├── backend/prisma/{schema.prisma,migrations,seed.ts}
└── README.md
```

### Rotas do frontend

```
/login · /register
/manager · /manager/services · /manager/professionals · /manager/customers
/manager/appointments · /manager/imports · /manager/dashboard
/professional · /professional/schedule
/customer · /customer/appointments · /customer/new-appointment
```

### Componentes shadcn/ui planejados

Button, Input, Select, Dialog, Table, Card, Badge, Calendar, Form, Toast/Sonner, Tabs, DropdownMenu, Sheet

---

## 4–7. Épicos, Histórias, Tarefas e Critérios de Aceite

---

### Épico 1 — Setup do Projeto e Docker (Concluído)

#### Objetivo
Estrutura base do monorepo com frontend, backend e infra Docker pronta para dev local.

#### Histórias de usuário
- Como dev, quero rodar `docker compose up` e ter tudo funcionando.

#### Tarefas
- [x] Criar repositório e estrutura de diretórios (frontend/, backend/)
- [x] Inicializar frontend com Vite (React + TypeScript)
- [x] Instalar e configurar Tailwind CSS
- [x] Instalar e configurar shadcn/ui
- [x] Inicializar backend com NestJS CLI
- [x] Criar docker-compose.yml (frontend, backend, postgres, redis)
- [x] Criar Dockerfiles com hot-reload
- [x] Criar .env.example
- [x] Configurar ESLint e Prettier

#### Critérios de aceite
- [x] `docker compose up` sobe tudo sem erros
- [x] Frontend em localhost:5173, backend em localhost:3000
- [x] Hot-reload funciona em ambos

---

### Épico 2 — Banco de Dados e Modelagem com Prisma (Concluído)

#### Objetivo
Schema Prisma completo, migrations e seeds de desenvolvimento.

#### Histórias de usuário
- Como dev, quero schema versionado com seeds para ter dados de teste consistentes.

#### Tarefas
- [x] Instalar Prisma no backend
- [x] Criar schema.prisma com todas as entidades e enums (Role, AppointmentStatus, NotificationType, ImportStatus, ImportRowStatus)
- [x] Configurar relações e índices
- [x] Habilitar extensão btree_gist
- [x] Criar exclusion constraint para impedir sobreposição de agendamentos
- [x] Gerar e executar migration inicial
- [x] Criar PrismaModule e PrismaService no NestJS
- [x] Criar seed.ts com dados de exemplo para todos os perfis
- [x] Validar schema com prisma validate e prisma generate

#### Critérios de aceite
- [x] Migration roda sem erros em banco limpo
- [x] Seed popula dados de todos os perfis
- [x] Exclusion constraint impede agendamentos sobrepostos via INSERT direto
- [x] PrismaService acessível via DI no NestJS

---

### Épico 3 — Autenticação e Autorização (Concluído)

#### Objetivo
Login JWT, registro de clientes e controle de acesso por role.

#### Histórias de usuário
- Como cliente, quero me cadastrar para agendar horários.
- Como usuário, quero fazer login com e-mail e senha.
- Como gestor, quero que cada perfil veja apenas suas telas.

#### Tarefas
- [x] Criar AuthModule (AuthService, AuthController)
- [x] POST /auth/register (auto-cadastro de cliente)
- [x] POST /auth/login (retorna access + refresh tokens)
- [x] POST /auth/refresh (renova access token)
- [x] Criar JwtStrategy e JwtAuthGuard
- [x] Criar RolesGuard e decorator @Roles()
- [x] Criar decorator @Public()
- [x] Criar UsersModule com UsersService
- [x] Hash de senha com bcrypt
- [x] Validação de DTOs com class-validator
- [x] Página /login no frontend
- [x] Página /register no frontend
- [x] Zustand store para auth (token, user, logout)
- [x] Interceptor Axios para attach de token e refresh automático
- [x] Componente ProtectedRoute no React Router
- [x] Redirecionamento por role após login

#### Critérios de aceite
- [x] Cliente se cadastra e faz login
- [x] Token expirado retorna 401; refresh renova
- [x] Rotas protegidas redirecionam para /login sem token
- [x] Usuário só acessa rotas do seu perfil

---

### Épico 4 — Cadastros Administrativos (Concluído)

#### Objetivo
CRUD de serviços e clientes pelo gestor.

#### Histórias de usuário
- Como gestor, quero cadastrar serviços (nome, duração, preço).
- Como gestor, quero listar e editar clientes.

#### Tarefas
- [x] Criar ServicesModule com CRUD completo
- [x] Endpoints REST /services
- [x] Criar CustomersModule com CRUD completo
- [x] Endpoints REST /customers
- [x] Paginação e busca nos endpoints de listagem
- [x] Validação de DTOs
- [x] Página /manager/services (tabela, busca, modal CRUD)
- [x] Página /manager/customers (tabela, busca, modal CRUD)
- [x] Feedback com Toast/Sonner

#### Critérios de aceite
- [x] Gestor cria, edita e desativa serviços
- [x] Gestor lista clientes com paginação e busca
- [x] Validações de formulário exibem erros
- [x] Apenas gestores acessam essas páginas

---

### Épico 5 — Jornada dos Profissionais e Serviços Executados (Concluído)

#### Objetivo
Cadastro de profissionais, jornada semanal e vínculo de serviços.

#### Histórias de usuário
- Como gestor, quero definir horários de trabalho dos profissionais.
- Como gestor, quero vincular serviços a profissionais.

#### Tarefas
- [x] Criar ProfessionalsModule com CRUD
- [x] Endpoints REST /professionals
- [x] Endpoint /professionals/:id/schedule (jornada semanal)
- [x] Endpoint /professionals/:id/services (vincular/desvincular)
- [x] Página /manager/professionals (tabela e modais)
- [x] Componente de edição de jornada semanal
- [x] Componente de seleção múltipla de serviços
- [x] Validação: horário início < fim

#### Critérios de aceite
- [x] Gestor cria profissional vinculado a usuário PROFESSIONAL
- [x] Gestor define jornada com múltiplos dias/horários
- [x] Gestor vincula serviços a profissional
- [x] API retorna profissionais com serviços e horários

---

### Épico 6 — Agendamento e Disponibilidade (Concluído)

#### Objetivo
Clientes consultam slots livres e agendam, remarcam ou cancelam horários.

#### Histórias de usuário
- Como cliente, quero consultar horários disponíveis para um serviço e profissional.
- Como cliente, quero reservar, remarcar e cancelar agendamentos.

#### Tarefas
- [x] Criar AppointmentsModule (AppointmentsService, AppointmentsController)
- [x] Lógica de cálculo de slots (jornada − agendamentos, fatiado pela duração)
- [x] GET /appointments/availability?professionalId=&serviceId=&date=
- [x] POST /appointments (criar)
- [x] PATCH /appointments/:id/reschedule (remarcar)
- [x] PATCH /appointments/:id/cancel (cancelar)
- [x] Regra de antecedência mínima para cancelamento
- [x] Página /customer/new-appointment (fluxo passo-a-passo: serviço→profissional→data→horário→confirmação)
- [x] Página /customer/appointments (lista com ações de remarcar/cancelar)
- [x] Componentes: Calendar, Select, Card, Dialog

#### Critérios de aceite
- [x] Slots consideram jornada, duração e agendamentos existentes
- [x] Cliente agenda, remarca e cancela com sucesso
- [x] Cancelamento fora do prazo é rejeitado
- [x] API retorna 409 ao agendar slot já ocupado

---

### Épico 7 — Proteção contra Double-Booking (Concluído)

#### Objetivo
Impedir que dois agendamentos sobrepostos sejam criados para o mesmo profissional, mesmo em requisições concorrentes.

#### Histórias de usuário
- Como sistema, quero impedir double-booking para evitar conflitos de agenda.

#### Tarefas
- [x] Transação Prisma com SELECT FOR UPDATE ao criar agendamento
- [x] Exclusion constraint PostgreSQL: `EXCLUDE USING gist (professional_id WITH =, tsrange(start_time, end_time) WITH &&) WHERE (status NOT IN ('CANCELLED'))`
- [x] Tratar violação de constraint → HTTP 409 Conflict
- [x] Teste automatizado: N requisições concorrentes → apenas 1 aceita
- [x] Documentar estratégia no README

#### Critérios de aceite
- [x] 10 requisições concorrentes para mesmo slot → 1 agendamento + 9 rejeitadas (409)
- [x] Agendamentos cancelados liberam o slot
- [x] Nenhum estado inconsistente possível no banco

---

### Épico 8 — Agenda por Perfil (Concluído)

#### Objetivo
Visualização de agenda adequada para cada perfil.

#### Histórias de usuário
- Como gestor, quero ver a agenda do dia de todos os profissionais.
- Como profissional, quero ver minha agenda do dia.
- Como cliente, quero ver meus próximos agendamentos.

#### Tarefas
- [x] GET /appointments com filtros (date, professionalId) para gestor
- [x] GET /appointments/my-schedule?date= para profissional
- [x] GET /appointments/my-appointments para cliente
- [x] Página /manager/appointments (visão por dia, filtro por profissional)
- [x] Página /professional/schedule (agenda do dia em timeline/lista)
- [x] Atualizar /customer/appointments (próximos + passados)
- [x] Componentes: Tabs, Card, Badge (status), Calendar

#### Critérios de aceite
- [x] Gestor vê agendamentos de todos os profissionais no dia
- [x] Profissional vê apenas seus agendamentos
- [x] Cliente vê apenas seus agendamentos
- [x] Filtro por data funciona corretamente

---

### Épico 9 — Status dos Atendimentos (Concluído)

#### Objetivo
Profissional atualiza status dos atendimentos (realizado, no-show, cancelado).

#### Histórias de usuário
- Como profissional, quero marcar atendimentos como realizado, no-show ou cancelado.

#### Tarefas
- [x] PATCH /appointments/:id/status (body: { status })
- [x] Validar transições de status (SCHEDULED → COMPLETED/NO_SHOW/CANCELLED)
- [x] Apenas profissional dono ou gestor pode alterar
- [x] Atualizar UI de /professional/schedule com botões de ação por status
- [x] Badge visual por status (cores distintas)

#### Critérios de aceite
- [x] Profissional muda status do atendimento
- [x] Transições inválidas retornam erro
- [x] UI reflete mudança de status em tempo real

---

### Épico 10 — Notificações Assíncronas (Concluído)

#### Objetivo
Processar notificações (confirmação, lembrete 24h, cancelamento, remarcação) de forma assíncrona com BullMQ.

#### Histórias de usuário
- Como cliente, quero receber notificação de confirmação ao agendar.
- Como cliente, quero receber lembrete 24h antes do atendimento.

#### Tarefas
- [x] Criar NotificationsModule
- [x] Configurar BullMQ com conexão Redis
- [x] Criar fila `notifications` e processor/worker
- [x] Emitir job ao criar, remarcar ou cancelar agendamento
- [x] Emitir job de lembrete 24h (delayed job ou cron)
- [x] Registrar notificação na tabela notifications
- [x] Garantir idempotência por chave (appointment_id, type)
- [x] Endpoint GET /notifications/my para cliente ver histórico
- [x] Tela de notificações no frontend (ou componente dropdown)

#### Critérios de aceite
- [x] Notificação registrada no banco após agendamento
- [x] Lembrete 24h criado como delayed job
- [x] Notificações não duplicam em reprocessamento
- [x] Confirmação do agendamento não é atrasada pela notificação

---

### Épico 11 — Importação em Massa (Concluído)

#### Objetivo
Gestor importa clientes e agendamentos antigos via CSV/Excel com processamento assíncrono.

#### Histórias de usuário
- Como gestor, quero importar clientes via CSV para migrar dados legados.
- Como gestor, quero acompanhar o status de cada importação.

#### Tarefas
- [x] Criar ImportsModule
- [x] Endpoint POST /imports/upload (multipart, salva arquivo)
- [x] Criar fila `imports` no BullMQ
- [x] Worker de importação com processamento linha a linha
- [x] Registrar ImportJob com status (QUEUED, PROCESSING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED)
- [x] Registrar ImportJobRow com (rowNumber, rawData, status, errorMessage)
- [x] Erros individuais não invalidam o lote
- [x] Endpoint GET /imports (listar jobs do gestor)
- [x] Endpoint GET /imports/:id (detalhes + linhas com erros)
- [x] Página /manager/imports com upload, lista de jobs e detalhes
- [x] Suporte a CSV e Excel (xlsx) via biblioteca (exceljs ou xlsx)

#### Critérios de aceite
- [x] Gestor faz upload de CSV e importação é enfileirada
- [x] Status do job atualiza conforme processamento
- [x] Linhas com erro são registradas sem parar o lote
- [x] Gestor visualiza detalhes de erros por linha
- [x] Apenas gestores acessam importação

---

### Épico 12 — Histórico e Filtros (Concluído)

#### Objetivo
Consulta de histórico de atendimentos com filtros avançados.

#### Histórias de usuário
- Como gestor, quero consultar histórico com filtros (período, profissional, serviço, status).

#### Tarefas
- [x] Endpoint GET /appointments/history com query params (dateFrom, dateTo, professionalId, serviceId, status, page, limit)
- [x] Paginação cursor-based ou offset
- [x] Página /manager/appointments com aba de histórico
- [x] Filtros com Select, DatePicker, Input
- [x] Exportação básica dos resultados (CSV)

#### Critérios de aceite
- [x] Filtros combinados retornam resultados corretos
- [x] Paginação funciona com filtros ativos
- [x] Performance aceitável com volume de dados do seed

---

### Épico 13 — Dashboard do Gestor (Concluído)

#### Objetivo
Painel com indicadores operacionais para o gestor.

#### Histórias de usuário
- Como gestor, quero ver taxa de ocupação, no-show, faturamento e serviços populares.

#### Tarefas
- [x] Criar DashboardModule
- [x] Endpoint GET /dashboard/stats?from=&to= retornando: occupancyByProfessional, noShowRate, estimatedRevenue, topServices
- [x] Queries otimizadas com agregações SQL
- [x] Cache Redis para queries pesadas (TTL 5min)
- [x] Página /manager/dashboard com cards e gráficos
- [x] Componentes: Card (KPIs), gráfico de barras (ocupação), lista (top serviços)
- [x] Filtro de período (semana, mês, customizado)

#### Critérios de aceite
- [x] Dashboard exibe 4 indicadores corretamente
- [x] Dados refletem agendamentos reais do período
- [x] Cache funciona e expira corretamente
- [x] Apenas gestores acessam o dashboard

---

### Épico 14 — Frontend Responsivo com shadcn/ui

#### Objetivo
Garantir experiência consistente em desktop, tablet e mobile.

#### Histórias de usuário
- Como cliente mobile, quero agendar horários pelo celular com boa experiência.
- Como profissional, quero consultar minha agenda no tablet.

#### Tarefas
- [ ] Definir breakpoints Tailwind (sm, md, lg, xl)
- [ ] Criar layouts responsivos (sidebar desktop → bottom nav ou Sheet mobile)
- [ ] Menu lateral colapsável no desktop, Sheet/drawer no mobile
- [ ] Tabelas responsivas (scroll horizontal ou cards em mobile)
- [ ] Formulários de agendamento adaptados para touch
- [ ] Testar fluxos em viewport 375px, 768px, 1024px, 1440px
- [ ] Ajustar tipografia e espaçamentos por breakpoint
- [ ] Garantir que Calendar e DatePicker funcionem bem em mobile

#### Critérios de aceite
- [ ] Todas as páginas navegáveis e funcionais em 375px (mobile)
- [ ] Sidebar funciona em desktop; Sheet funciona em mobile
- [ ] Tabelas não quebram o layout em telas pequenas
- [ ] Fluxo de agendamento funciona por completo em mobile

---

### Épico 15 — Testes e Validações

#### Objetivo
Cobertura de testes para lógica crítica de negócio.

#### Histórias de usuário
- Como dev, quero testes automatizados para garantir estabilidade em mudanças.

#### Tarefas
- [ ] Configurar Jest no backend com módulo de teste do NestJS
- [ ] Configurar Vitest no frontend
- [ ] Testes unitários: cálculo de disponibilidade de slots
- [ ] Testes unitários: transições de status de agendamento
- [ ] Testes unitários: validações de DTOs
- [ ] Teste de integração: fluxo de agendamento completo
- [ ] Teste de integração: double-booking (concorrência)
- [ ] Teste de integração: importação com partial failure
- [ ] Testes de componente no frontend (formulários, fluxo de agendamento)
- [ ] Pipeline de CI básico (lint + test)

#### Critérios de aceite
- [ ] Testes de lógica de agendamento passam
- [ ] Teste de double-booking concorrente passa
- [ ] Teste de importação com erros parciais passa
- [ ] `npm test` roda sem falhas em backend e frontend

---

### Épico 16 — README, Seed e Documentação Final

#### Objetivo
Documentação completa para onboarding e execução do projeto.

#### Histórias de usuário
- Como dev novo, quero seguir o README e rodar o projeto sem ajuda externa.

#### Tarefas
- [ ] README.md com: visão geral, stack, como rodar, variáveis de ambiente, comandos úteis
- [ ] Documentar decisão de double-booking no README
- [ ] Seed completo com: 1 gestor, 3 profissionais, 10 clientes, 5 serviços, jornadas, 30+ agendamentos
- [ ] Script npm para reset do banco (drop + migrate + seed)
- [ ] Documentar endpoints da API (lista de rotas com métodos e descrição)
- [ ] Documentar arquitetura de filas (BullMQ + Redis)
- [ ] Checklist de deploy

#### Critérios de aceite
- [ ] Dev segue o README e roda o projeto do zero
- [ ] Seed gera dados suficientes para testar todos os fluxos
- [ ] Documentação de API lista todos os endpoints

---

## 8. Sugestão de Ordem de Implementação (7 dias)

| Dia | Épicos | Foco |
|-----|--------|------|
| **1** | 1, 2 | Setup Docker, Prisma schema, migrations, seed básico |
| **2** | 3 | Auth completa (backend + frontend), login/register, guards, stores |
| **3** | 4, 5 | CRUDs administrativos (serviços, clientes, profissionais, jornada) |
| **4** | 6, 7 | Agendamento, cálculo de disponibilidade, proteção double-booking |
| **5** | 8, 9, 10 | Agendas por perfil, status de atendimento, notificações assíncronas |
| **6** | 11, 12, 13 | Importação em massa, histórico com filtros, dashboard do gestor |
| **7** | 14, 15, 16 | Responsividade, testes críticos, seed final, README e documentação |

> **Recomendação:** Nos dias 1–4, priorizar backend com testes mínimos. Nos dias 5–7, fechar frontend e polir. Testes de concorrência (double-booking) devem ser feitos no dia 4, pois são críticos.

---

## 9. Itens Fora do Escopo Inicial

- [ ] Envio real de e-mail, SMS ou push notification (MVP simula/registra no banco)
- [ ] Pagamento online e integração com gateways
- [ ] Multi-tenancy (múltiplos salões com isolamento de dados)
- [ ] App mobile nativo (React Native / Flutter)
- [ ] Integração com Google Calendar ou iCal
- [ ] Sistema de avaliação/review de profissionais
- [ ] Programa de fidelidade ou cupons de desconto
- [ ] Chat em tempo real entre cliente e profissional
- [ ] Upload de fotos de portfólio do profissional
- [ ] Relatórios exportáveis em PDF
- [ ] PWA (Progressive Web App) com notificações push
- [ ] Internacionalização (i18n) — MVP em português (pt-BR)
- [ ] Logs centralizados (ELK/Grafana) — dev usa console
- [ ] Rate limiting e throttling avançado
- [ ] Testes e2e com Playwright/Cypress
