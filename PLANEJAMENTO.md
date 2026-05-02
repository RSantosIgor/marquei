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

### Épico 2 — Banco de Dados e Modelagem com Prisma

#### Objetivo
Schema Prisma completo, migrations e seeds de desenvolvimento.

#### Histórias de usuário
- Como dev, quero schema versionado com seeds para ter dados de teste consistentes.

#### Tarefas
- [ ] Instalar Prisma no backend
- [ ] Criar schema.prisma com todas as entidades e enums (Role, AppointmentStatus, NotificationType, ImportStatus, ImportRowStatus)
- [ ] Configurar relações e índices
- [ ] Habilitar extensão btree_gist
- [ ] Criar exclusion constraint para impedir sobreposição de agendamentos
- [ ] Gerar e executar migration inicial
- [ ] Criar PrismaModule e PrismaService no NestJS
- [ ] Criar seed.ts com dados de exemplo para todos os perfis
- [ ] Validar schema com prisma validate e prisma generate

#### Critérios de aceite
- [ ] Migration roda sem erros em banco limpo
- [ ] Seed popula dados de todos os perfis
- [ ] Exclusion constraint impede agendamentos sobrepostos via INSERT direto
- [ ] PrismaService acessível via DI no NestJS

---

### Épico 3 — Autenticação e Autorização

#### Objetivo
Login JWT, registro de clientes e controle de acesso por role.

#### Histórias de usuário
- Como cliente, quero me cadastrar para agendar horários.
- Como usuário, quero fazer login com e-mail e senha.
- Como gestor, quero que cada perfil veja apenas suas telas.

#### Tarefas
- [ ] Criar AuthModule (AuthService, AuthController)
- [ ] POST /auth/register (auto-cadastro de cliente)
- [ ] POST /auth/login (retorna access + refresh tokens)
- [ ] POST /auth/refresh (renova access token)
- [ ] Criar JwtStrategy e JwtAuthGuard
- [ ] Criar RolesGuard e decorator @Roles()
- [ ] Criar decorator @Public()
- [ ] Criar UsersModule com UsersService
- [ ] Hash de senha com bcrypt
- [ ] Validação de DTOs com class-validator
- [ ] Página /login no frontend
- [ ] Página /register no frontend
- [ ] Zustand store para auth (token, user, logout)
- [ ] Interceptor Axios para attach de token e refresh automático
- [ ] Componente ProtectedRoute no React Router
- [ ] Redirecionamento por role após login

#### Critérios de aceite
- [ ] Cliente se cadastra e faz login
- [ ] Token expirado retorna 401; refresh renova
- [ ] Rotas protegidas redirecionam para /login sem token
- [ ] Usuário só acessa rotas do seu perfil

---

### Épico 4 — Cadastros Administrativos

#### Objetivo
CRUD de serviços e clientes pelo gestor.

#### Histórias de usuário
- Como gestor, quero cadastrar serviços (nome, duração, preço).
- Como gestor, quero listar e editar clientes.

#### Tarefas
- [ ] Criar ServicesModule com CRUD completo
- [ ] Endpoints REST /services
- [ ] Criar CustomersModule com CRUD completo
- [ ] Endpoints REST /customers
- [ ] Paginação e busca nos endpoints de listagem
- [ ] Validação de DTOs
- [ ] Página /manager/services (tabela, busca, modal CRUD)
- [ ] Página /manager/customers (tabela, busca, modal CRUD)
- [ ] Feedback com Toast/Sonner

#### Critérios de aceite
- [ ] Gestor cria, edita e desativa serviços
- [ ] Gestor lista clientes com paginação e busca
- [ ] Validações de formulário exibem erros
- [ ] Apenas gestores acessam essas páginas

---

### Épico 5 — Jornada dos Profissionais e Serviços Executados

#### Objetivo
Cadastro de profissionais, jornada semanal e vínculo de serviços.

#### Histórias de usuário
- Como gestor, quero definir horários de trabalho dos profissionais.
- Como gestor, quero vincular serviços a profissionais.

#### Tarefas
- [ ] Criar ProfessionalsModule com CRUD
- [ ] Endpoints REST /professionals
- [ ] Endpoint /professionals/:id/schedule (jornada semanal)
- [ ] Endpoint /professionals/:id/services (vincular/desvincular)
- [ ] Página /manager/professionals (tabela e modais)
- [ ] Componente de edição de jornada semanal
- [ ] Componente de seleção múltipla de serviços
- [ ] Validação: horário início < fim

#### Critérios de aceite
- [ ] Gestor cria profissional vinculado a usuário PROFESSIONAL
- [ ] Gestor define jornada com múltiplos dias/horários
- [ ] Gestor vincula serviços a profissional
- [ ] API retorna profissionais com serviços e horários

---

### Épico 6 — Agendamento e Disponibilidade

#### Objetivo
Clientes consultam slots livres e agendam, remarcam ou cancelam horários.

#### Histórias de usuário
- Como cliente, quero consultar horários disponíveis para um serviço e profissional.
- Como cliente, quero reservar, remarcar e cancelar agendamentos.

#### Tarefas
- [ ] Criar AppointmentsModule (AppointmentsService, AppointmentsController)
- [ ] Lógica de cálculo de slots (jornada − agendamentos, fatiado pela duração)
- [ ] GET /appointments/availability?professionalId=&serviceId=&date=
- [ ] POST /appointments (criar)
- [ ] PATCH /appointments/:id/reschedule (remarcar)
- [ ] PATCH /appointments/:id/cancel (cancelar)
- [ ] Regra de antecedência mínima para cancelamento
- [ ] Página /customer/new-appointment (fluxo passo-a-passo: serviço→profissional→data→horário→confirmação)
- [ ] Página /customer/appointments (lista com ações de remarcar/cancelar)
- [ ] Componentes: Calendar, Select, Card, Dialog

#### Critérios de aceite
- [ ] Slots consideram jornada, duração e agendamentos existentes
- [ ] Cliente agenda, remarca e cancela com sucesso
- [ ] Cancelamento fora do prazo é rejeitado
- [ ] API retorna 409 ao agendar slot já ocupado

---

### Épico 7 — Proteção contra Double-Booking

#### Objetivo
Impedir que dois agendamentos sobrepostos sejam criados para o mesmo profissional, mesmo em requisições concorrentes.

#### Histórias de usuário
- Como sistema, quero impedir double-booking para evitar conflitos de agenda.

#### Tarefas
- [ ] Transação Prisma com SELECT FOR UPDATE ao criar agendamento
- [ ] Exclusion constraint PostgreSQL: `EXCLUDE USING gist (professional_id WITH =, tsrange(start_time, end_time) WITH &&) WHERE (status NOT IN ('CANCELLED'))`
- [ ] Tratar violação de constraint → HTTP 409 Conflict
- [ ] Teste automatizado: N requisições concorrentes → apenas 1 aceita
- [ ] Documentar estratégia no README

#### Critérios de aceite
- [ ] 10 requisições concorrentes para mesmo slot → 1 agendamento + 9 rejeitadas (409)
- [ ] Agendamentos cancelados liberam o slot
- [ ] Nenhum estado inconsistente possível no banco

---

### Épico 8 — Agenda por Perfil

#### Objetivo
Visualização de agenda adequada para cada perfil.

#### Histórias de usuário
- Como gestor, quero ver a agenda do dia de todos os profissionais.
- Como profissional, quero ver minha agenda do dia.
- Como cliente, quero ver meus próximos agendamentos.

#### Tarefas
- [ ] GET /appointments com filtros (date, professionalId) para gestor
- [ ] GET /appointments/my-schedule?date= para profissional
- [ ] GET /appointments/my-appointments para cliente
- [ ] Página /manager/appointments (visão por dia, filtro por profissional)
- [ ] Página /professional/schedule (agenda do dia em timeline/lista)
- [ ] Atualizar /customer/appointments (próximos + passados)
- [ ] Componentes: Tabs, Card, Badge (status), Calendar

#### Critérios de aceite
- [ ] Gestor vê agendamentos de todos os profissionais no dia
- [ ] Profissional vê apenas seus agendamentos
- [ ] Cliente vê apenas seus agendamentos
- [ ] Filtro por data funciona corretamente

---

### Épico 9 — Status dos Atendimentos

#### Objetivo
Profissional atualiza status dos atendimentos (realizado, no-show, cancelado).

#### Histórias de usuário
- Como profissional, quero marcar atendimentos como realizado, no-show ou cancelado.

#### Tarefas
- [ ] PATCH /appointments/:id/status (body: { status })
- [ ] Validar transições de status (SCHEDULED → COMPLETED/NO_SHOW/CANCELLED)
- [ ] Apenas profissional dono ou gestor pode alterar
- [ ] Atualizar UI de /professional/schedule com botões de ação por status
- [ ] Badge visual por status (cores distintas)

#### Critérios de aceite
- [ ] Profissional muda status do atendimento
- [ ] Transições inválidas retornam erro
- [ ] UI reflete mudança de status em tempo real

---

### Épico 10 — Notificações Assíncronas

#### Objetivo
Processar notificações (confirmação, lembrete 24h, cancelamento, remarcação) de forma assíncrona com BullMQ.

#### Histórias de usuário
- Como cliente, quero receber notificação de confirmação ao agendar.
- Como cliente, quero receber lembrete 24h antes do atendimento.

#### Tarefas
- [ ] Criar NotificationsModule
- [ ] Configurar BullMQ com conexão Redis
- [ ] Criar fila `notifications` e processor/worker
- [ ] Emitir job ao criar, remarcar ou cancelar agendamento
- [ ] Emitir job de lembrete 24h (delayed job ou cron)
- [ ] Registrar notificação na tabela notifications
- [ ] Garantir idempotência por chave (appointment_id, type)
- [ ] Endpoint GET /notifications/my para cliente ver histórico
- [ ] Tela de notificações no frontend (ou componente dropdown)

#### Critérios de aceite
- [ ] Notificação registrada no banco após agendamento
- [ ] Lembrete 24h criado como delayed job
- [ ] Notificações não duplicam em reprocessamento
- [ ] Confirmação do agendamento não é atrasada pela notificação

---

### Épico 11 — Importação em Massa

#### Objetivo
Gestor importa clientes e agendamentos antigos via CSV/Excel com processamento assíncrono.

#### Histórias de usuário
- Como gestor, quero importar clientes via CSV para migrar dados legados.
- Como gestor, quero acompanhar o status de cada importação.

#### Tarefas
- [ ] Criar ImportsModule
- [ ] Endpoint POST /imports/upload (multipart, salva arquivo)
- [ ] Criar fila `imports` no BullMQ
- [ ] Worker de importação com processamento linha a linha
- [ ] Registrar ImportJob com status (QUEUED, PROCESSING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED)
- [ ] Registrar ImportJobRow com (rowNumber, rawData, status, errorMessage)
- [ ] Erros individuais não invalidam o lote
- [ ] Endpoint GET /imports (listar jobs do gestor)
- [ ] Endpoint GET /imports/:id (detalhes + linhas com erros)
- [ ] Página /manager/imports com upload, lista de jobs e detalhes
- [ ] Suporte a CSV e Excel (xlsx) via biblioteca (exceljs ou xlsx)

#### Critérios de aceite
- [ ] Gestor faz upload de CSV e importação é enfileirada
- [ ] Status do job atualiza conforme processamento
- [ ] Linhas com erro são registradas sem parar o lote
- [ ] Gestor visualiza detalhes de erros por linha
- [ ] Apenas gestores acessam importação

---

### Épico 12 — Histórico e Filtros

#### Objetivo
Consulta de histórico de atendimentos com filtros avançados.

#### Histórias de usuário
- Como gestor, quero consultar histórico com filtros (período, profissional, serviço, status).

#### Tarefas
- [ ] Endpoint GET /appointments/history com query params (dateFrom, dateTo, professionalId, serviceId, status, page, limit)
- [ ] Paginação cursor-based ou offset
- [ ] Página /manager/appointments com aba de histórico
- [ ] Filtros com Select, DatePicker, Input
- [ ] Exportação básica dos resultados (CSV)

#### Critérios de aceite
- [ ] Filtros combinados retornam resultados corretos
- [ ] Paginação funciona com filtros ativos
- [ ] Performance aceitável com volume de dados do seed

---

### Épico 13 — Dashboard do Gestor

#### Objetivo
Painel com indicadores operacionais para o gestor.

#### Histórias de usuário
- Como gestor, quero ver taxa de ocupação, no-show, faturamento e serviços populares.

#### Tarefas
- [ ] Criar DashboardModule
- [ ] Endpoint GET /dashboard/stats?from=&to= retornando: occupancyByProfessional, noShowRate, estimatedRevenue, topServices
- [ ] Queries otimizadas com agregações SQL
- [ ] Cache Redis para queries pesadas (TTL 5min)
- [ ] Página /manager/dashboard com cards e gráficos
- [ ] Componentes: Card (KPIs), gráfico de barras (ocupação), lista (top serviços)
- [ ] Filtro de período (semana, mês, customizado)

#### Critérios de aceite
- [ ] Dashboard exibe 4 indicadores corretamente
- [ ] Dados refletem agendamentos reais do período
- [ ] Cache funciona e expira corretamente
- [ ] Apenas gestores acessam o dashboard

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
