# Marquei

Plataforma de agendamento online para salões de beleza e clínicas de estética. Substitui processos manuais em planilhas e telefone por um sistema automatizado de agendamento com controle de acesso por perfil, notificações assíncronas e importação em massa de clientes.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| Backend | NestJS + TypeScript |
| Banco de dados | PostgreSQL 16 + Prisma ORM |
| Fila | BullMQ + Redis 7 |
| Autenticação | JWT (access + refresh), bcrypt, RBAC |
| Infra | Docker Compose |

**Por que essa stack?** O NestJS foi escolhido pela arquitetura modular, injeção de dependência nativa e suporte de primeira classe a TypeScript — que combina naturalmente com o ORM tipado do Prisma. React + Vite entrega feedback rápido no desenvolvimento e um rico ecossistema de componentes via shadcn/ui. O PostgreSQL foi escolhido em vez do MySQL por suportar exclusion constraints (`btree_gist` + `tsrange`), que funcionam como uma camada de segurança no banco contra double-booking. BullMQ + Redis tratam cargas de trabalho assíncronas (notificações, importações) sem adicionar complexidade de infraestrutura além de uma única instância Redis.

## Estrutura do Projeto

```
marquei/
├── frontend/               # SPA React + Vite
│   └── src/
│       ├── components/ui/  # Componentes shadcn/ui
│       ├── pages/          # Páginas por perfil (manager/, professional/, customer/, auth/)
│       ├── layouts/        # Layouts por perfil
│       ├── services/       # Funções de chamada à API (axios)
│       ├── stores/         # Stores Zustand (auth, UI)
│       └── hooks/          # Custom React hooks
├── backend/                # API NestJS
│   ├── src/
│   │   ├── auth/           # Auth JWT, guards, decorators
│   │   ├── appointments/   # Agendamento, disponibilidade, status
│   │   ├── professionals/  # Profissionais + jornadas de trabalho
│   │   ├── services/       # Serviços do salão (CRUD)
│   │   ├── customers/      # Gestão de clientes
│   │   ├── dashboard/      # Indicadores agregados
│   │   ├── imports/        # Importação em massa CSV/XLSX
│   │   ├── notifications/  # Workers BullMQ de notificações
│   │   └── common/         # Guards, decorators, filtros
│   └── prisma/             # Schema + migrations + seed
├── docker-compose.yml
└── PLANEJAMENTO.md         # Plano completo do projeto
```

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose

## Rodando em Desenvolvimento

### 1. Subir a infraestrutura

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # configurar variáveis de ambiente
npm install
npx prisma migrate dev        # executar migrations
npx prisma db seed            # popular com dados de demonstração
npm run start:dev             # inicia em http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # inicia em http://localhost:5173
```

### Rodando com Docker Compose (stack completa)

```bash
docker compose up -d
```

Serviços expostos:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **pgAdmin:** http://localhost:5050 (admin@marquei.com / admin)

## Variáveis de Ambiente

Copie `backend/.env.example` para `backend/.env` e preencha os valores.

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://marquei:marquei@localhost:5432/marquei` |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `JWT_SECRET` | Segredo para assinar o access token | — |
| `JWT_REFRESH_SECRET` | Segredo para assinar o refresh token | — |
| `JWT_EXPIRATION` | TTL do access token | `15m` |
| `JWT_REFRESH_EXPIRATION` | TTL do refresh token | `7d` |
| `PORT` | Porta do servidor HTTP | `3000` |

> **Produção:** Sempre use valores fortes e únicos para `JWT_SECRET` e `JWT_REFRESH_SECRET`.

## Comandos do Banco de Dados

```bash
cd backend

npx prisma migrate dev        # criar e executar uma nova migration
npx prisma migrate deploy     # executar migrations pendentes (produção)
npx prisma generate           # regenerar o Prisma client após mudanças no schema
npx prisma db seed            # popular com dados de demonstração
npm run db:reset              # resetar o banco, re-executar todas as migrations e o seed
npx prisma studio             # abrir o navegador visual do banco em http://localhost:5555
```

## Contas de Teste (seed)

Todos os usuários abaixo são criados pelo `npx prisma db seed`. A senha de todos é `123456`.

| Perfil | Nome | E-mail |
|---|---|---|
| Gestor | Ana Silva | gestor@marquei.com |
| Profissional | Carla Oliveira (Cabelo) | carla@marquei.com |
| Profissional | Marcos Santos (Barba) | marcos@marquei.com |
| Profissional | Julia Costa (Unhas) | julia@marquei.com |
| Cliente | Maria Fernandes | maria@email.com |
| Cliente | João Pereira | joao@email.com |
| Cliente | Camila Lima | camila@email.com |
| Cliente | Pedro Almeida | pedro@email.com |
| Cliente | Fernanda Souza | fernanda@email.com |
| Cliente | Lucas Martins | lucas@email.com |
| Cliente | Beatriz Rocha | beatriz@email.com |
| Cliente | Rafael Dias | rafael@email.com |
| Cliente | Larissa Gomes | larissa@email.com |
| Cliente | Thiago Ribeiro | thiago@email.com |

## Endpoints da API

Todos os endpoints são servidos a partir de `http://localhost:3000`.

A autenticação usa tokens JWT Bearer. Rotas públicas estão marcadas com `[público]`. As demais exigem `Authorization: Bearer <token>`.

### Auth

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | público | Registrar novo usuário |
| `POST` | `/auth/login` | público | Autenticar, retorna access + refresh tokens |
| `POST` | `/auth/refresh` | público | Trocar refresh token por novo access token |
| `GET` | `/auth/me` | qualquer perfil | Obter perfil do usuário atual |

### Serviços (GESTOR)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/services` | Criar serviço |
| `GET` | `/services` | Listar serviços (`?page=&limit=&search=`) |
| `GET` | `/services/:id` | Buscar serviço por ID |
| `PATCH` | `/services/:id` | Atualizar serviço |
| `DELETE` | `/services/:id` | Desativar serviço |

### Profissionais (GESTOR)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/professionals` | Criar profissional |
| `GET` | `/professionals` | Listar profissionais (`?page=&limit=&search=`) |
| `GET` | `/professionals/:id` | Buscar profissional |
| `PATCH` | `/professionals/:id` | Atualizar profissional |
| `DELETE` | `/professionals/:id` | Desativar profissional |
| `PUT` | `/professionals/:id/schedule` | Substituir jornada semanal completa |
| `PUT` | `/professionals/:id/services` | Definir serviços vinculados |

### Clientes (GESTOR)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/customers` | Criar cliente |
| `GET` | `/customers` | Listar clientes (`?page=&limit=&search=`) |
| `GET` | `/customers/:id` | Buscar cliente |
| `PATCH` | `/customers/:id` | Atualizar cliente |
| `DELETE` | `/customers/:id` | Desativar cliente |

### Agendamentos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/appointments/services` | CLIENTE | Listar serviços disponíveis para agendamento |
| `GET` | `/appointments/professionals` | CLIENTE | Listar profissionais para um serviço (`?serviceId=`) |
| `GET` | `/appointments/availability` | CLIENTE | Obter horários disponíveis (`?professionalId=&serviceId=&date=YYYY-MM-DD`) |
| `POST` | `/appointments` | CLIENTE | Realizar agendamento |
| `GET` | `/appointments/mine` | CLIENTE | Listar meus agendamentos |
| `PATCH` | `/appointments/:id/reschedule` | CLIENTE | Remarcar agendamento |
| `PATCH` | `/appointments/:id/cancel` | CLIENTE | Cancelar agendamento (regra 24h) |
| `GET` | `/appointments/all` | GESTOR | Listar todos os agendamentos com filtros |
| `GET` | `/appointments/history` | GESTOR | Histórico de agendamentos |
| `GET` | `/appointments/my-schedule` | PROFISSIONAL | Agenda do dia (`?date=YYYY-MM-DD`) |
| `PATCH` | `/appointments/:id/status` | PROFISSIONAL, GESTOR | Atualizar status do agendamento |

**Transições de status:**
- `SCHEDULED` → `COMPLETED` | `NO_SHOW` | `CANCELLED`
- Estados terminais (`COMPLETED`, `NO_SHOW`, `CANCELLED`) não permitem novas transições

### Dashboard (GESTOR)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/dashboard/stats` | Indicadores agregados (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) |

### Importações (GESTOR)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/imports/upload` | Enviar arquivo CSV ou XLSX (multipart/form-data, campo: `file`, máx 10 MB) |
| `GET` | `/imports` | Listar jobs de importação |
| `GET` | `/imports/:id` | Buscar job de importação com resultados por linha |

### Notificações (CLIENTE)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/notifications/my` | Listar minhas notificações |
| `PATCH` | `/notifications/:id/read` | Marcar notificação como lida |

### Formato de Resposta

```json
// Sucesso (recurso único)
{ "data": { ... } }

// Sucesso (lista)
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }

// Erro
{ "statusCode": 404, "message": "Recurso não encontrado" }
```

## Arquitetura de Filas

O Marquei usa **BullMQ** com **Redis** para duas filas assíncronas.

```
Requisição do Cliente
        │
        ▼
NestJS Controller
        │
        ├─ fila imports ────────► ImportsProcessor
        │   (conteúdo do arquivo)       │
        │                          parse CSV/XLSX
        │                          validar linhas
        │                          criar usuários + clientes (transação)
        │                          atualizar status do ImportJob
        │
        └─ fila notifications ──► NotificationsProcessor
            (appointmentId,              │
             type)                 buscar agendamento
                                   registrar Notification (idempotente)
                                   enviar (e-mail/push — plugável)
```

### Fila de Importações (`imports`)

Acionada quando o gestor envia um arquivo CSV ou XLSX. O payload do job contém o conteúdo do arquivo em base64 e o ID do job. O processamento é **tolerante a falhas por linha**: linhas válidas são importadas mesmo que outras falhem.

Ciclo de vida do job: `QUEUED` → `PROCESSING` → `COMPLETED` | `COMPLETED_WITH_ERRORS` | `FAILED`

### Fila de Notificações (`notifications`)

Acionada após eventos de agendamento. Os IDs dos jobs são determinísticos (`${appointmentId}-${type}-${userId}`) para tornar o disparo **idempotente** — eventos duplicados não geram notificações duplicadas.

Tipos de notificação: `CONFIRMATION`, `REMINDER_24H`, `CANCELLATION`, `RESCHEDULE`

## Prevenção de Double-Booking

Duas camadas complementares evitam agendamentos sobrepostos para o mesmo profissional:

1. **Camada de aplicação:** `prisma.$transaction()` com bloqueio advisory do PostgreSQL serializa requisições concorrentes antes de inserir.

2. **Camada de banco:** Exclusion constraint do PostgreSQL usando a extensão `btree_gist` e uma coluna `tsrange` rejeita qualquer inserção que sobreponha um agendamento existente, mesmo sob condições de corrida que burlam o bloqueio da aplicação.

```sql
-- trecho do schema
ALTER TABLE appointments
  ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (professional_id WITH =, time_range WITH &&);
```

## Rodando os Testes

```bash
# Backend (Jest)
cd backend
npm test                       # rodar todos os testes unitários
npm test -- --no-coverage      # pular relatório de cobertura
npm test -- --watch            # modo watch

# Frontend (Vitest)
cd frontend
npm test                       # rodar todos os testes uma vez
npm run test:watch             # modo watch
```

## Lint

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

## CI

O GitHub Actions executa em todo push e pull request para `main`:
- **Job backend:** `npm ci` → `prisma generate` → `lint` → `test`
- **Job frontend:** `npm ci` → `lint` → `test`

Veja [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Checklist de Deploy

- [ ] Definir `JWT_SECRET` e `JWT_REFRESH_SECRET` fortes (mín. 32 chars, aleatórios)
- [ ] Definir `DATABASE_URL` apontando para o PostgreSQL de produção
- [ ] Definir `REDIS_HOST` / `REDIS_PORT` apontando para o Redis de produção
- [ ] Executar `npx prisma migrate deploy` (não `migrate dev`)
- [ ] Habilitar a extensão `btree_gist` no PostgreSQL (`CREATE EXTENSION IF NOT EXISTS btree_gist;`)
- [ ] Configurar a origem CORS no NestJS para corresponder à URL do frontend em produção
- [ ] Definir `NODE_ENV=production`
- [ ] Usar um gerenciador de processos (PM2, systemd) ou orquestração de contêineres para restarts sem downtime
- [ ] Configurar agregação de logs para falhas de jobs BullMQ
- [ ] Configurar persistência do Redis (`appendonly yes`) para sobreviver a restarts
- [ ] Configurar backups do banco (agendamento de pg_dump ou snapshots de banco gerenciado)
- [ ] Executar `npm run db:seed` apenas no primeiro deploy; pular nos subsequentes

## O Que Ficou de Fora

Com mais tempo, estas são as áreas que eu melhoraria:

- **Envio de e-mail/SMS:** As notificações são atualmente persistidas no banco e expostas via API, mas nenhum e-mail ou push notification é enviado de fato. A arquitetura está pronta — o `NotificationsProcessor` é o ponto de integração com SendGrid, SES ou Twilio.
- **Testes de frontend:** O backend possui testes unitários e e2e para os fluxos críticos (agendamentos, importações, double-booking), mas a cobertura de testes do frontend é mínima. Eu adicionaria testes com React Testing Library para o fluxo de agendamento e o dashboard do gestor.
- **Atualizações em tempo real:** As visões de agenda do gestor e do profissional dependem de refresh manual ou re-fetch. WebSockets (via `@nestjs/websockets`) ou Server-Sent Events proporcionariam atualizações ao vivo quando novos agendamentos forem criados ou o status mudar.
- **Importação de agendamentos:** A importação em massa atualmente suporta apenas cadastros de clientes. Estendê-la para importar agendamentos históricos (como o case menciona) exigiria mapear nomes de profissionais e serviços da planilha para registros existentes no banco.
- **Rate limiting:** Não há limitação de taxa implementada. Em produção, os endpoints de autenticação (`/login`, `/register`) deveriam ser protegidos contra ataques de força bruta.
- **Log de auditoria:** Não existe histórico de alterações para agendamentos ou transições de status. Um rastro de auditoria seria valioso para resolução de disputas.
