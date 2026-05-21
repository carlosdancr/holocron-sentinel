# Holocron Sentinel

Sistema de monitoramento operacional da Aliança Rebelde. Registra eventos associados a entidades estratégicas, aplica regras de suspensão automática por limite crítico, e transmite dados em tempo real via SSE.

## Como rodar o projeto

### Pré-requisitos

- Node.js 20+
- Docker (para o PostgreSQL)

### Variáveis de ambiente

Os arquivos `.env` (`backend/.env`, `backend/.env.test` e `frontend/.env.local`) foram commitados intencionalmente para que o projeto funcione sem nenhuma configuração manual. Eles contêm apenas credenciais do banco local via Docker e a URL do backend — nenhum dado sensível ou de produção.

### 1. Subir o banco de dados

```bash
docker-compose up -d
```

Isso inicia um PostgreSQL 16 em `localhost:5432` com o banco `holocron_sentinel`.

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate deploy    # aplica as migrations no banco
npm run dev                  # inicia em http://localhost:3333
```

### 3. Seed (opcional)

```bash
cd backend
npm run seed                 # popula o banco com dados de exemplo
```

Insere 50 entidades temáticas de Star Wars (planetas, bases, estações orbitais, naves capitais e caças) e ~1.200 eventos variados (info, warning, critical) com payloads realistas. Algumas entidades (~20%) são automaticamente suspensas por atingirem o limite crítico. Útil para validar o dashboard, ranking e feed sem precisar cadastrar dados manualmente.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev                  # inicia em http://localhost:3000
```

### 4. Testes

#### Backend

```bash
cd backend
npm test
```

Os testes rodam contra um banco dedicado (`holocron_sentinel_test`), separado do banco de desenvolvimento. Na primeira execução, o setup global do Vitest cria o banco automaticamente e aplica as migrations. São 30 testes de integração cobrindo:

- Criação, listagem e paginação de entidades
- Registro de eventos (info, warning, critical)
- Idempotência por `external_id`
- Suspensão automática ao atingir o limite crítico
- Rejeição de eventos em entidades suspensas
- Reset do contador ao reativar
- Ranking de entidades críticas
- Histórico paginado de eventos por entidade
- **Concorrência real** — 6 testes que disparam múltiplas requests simultâneas:
  - 20 requests com mesmo `external_id` → apenas 1 evento criado, 19 duplicatas
  - 5 eventos críticos simultâneos → contador exato, sem double-count
  - Eventos não-críticos simultâneos não incrementam o contador
  - Limite exato de suspensão sob concorrência → exatamente 1 response com `entitySuspended: true`
  - Requests além do limite são rejeitadas (422)
  - Requests simultâneas em entidade já suspensa → todas rejeitadas

#### Frontend

```bash
cd frontend
npm test
```

São 33 testes unitários com Vitest + React Testing Library cobrindo:

- **Utilitários** (`cn`, `formatRelative`, `formatTime`, `formatDateTime`, `formatDate`) — funções puras com edge cases (null, diferenças de tempo, formatos pt-BR)
- **Hooks de API** (`useEntities`, `useRanking`, `useCreateEntity`, `useCreateEvent`, `useToggleEntityStatus`) — chamadas corretas ao backend, passagem de parâmetros, tratamento de sucesso/erro, flags de idempotência e suspensão
- **Hook SSE** (`useEventStream`) — conexão, recebimento de eventos, deduplicação por ID, limite de buffer (100), pause/resume/clear, backoff exponencial na reconexão, remoção de flag de animação

---

## Stack

| Camada    | Tecnologia                                                                  |
| --------- | --------------------------------------------------------------------------- |
| Backend   | Node.js + TypeScript, Fastify, Prisma ORM                                   |
| Banco     | PostgreSQL 16 (via Docker)                                                  |
| Frontend  | Next.js 16, React 19, TanStack Table, TanStack Query, Tailwind CSS v4       |
| Testes    | Vitest — integração (backend) + unitários (frontend, React Testing Library) |
| Streaming | Server-Sent Events (SSE)                                                    |

---

## Decisões técnicas

### Fastify + Zod

Fastify foi escolhido pela performance e pelo ecossistema de plugins. A integração com Zod (`fastify-type-provider-zod`) permite que os schemas de validação sejam a única fonte de verdade — o TypeScript infere os tipos diretamente dos schemas, eliminando interfaces duplicadas.

### Prisma com driver adapter (pg)

O Prisma é usado para migrations, tipos gerados e queries simples. Para queries complexas (agregações, `SELECT FOR UPDATE`, ranking com `GROUP BY`), usamos raw SQL diretamente via `$queryRaw` / `$queryRawUnsafe`. O driver adapter (`@prisma/adapter-pg`) permite usar um pool de conexões do `pg` nativo, dando controle total sobre conexões.

### Next.js 16 (App Router)

O frontend usa o App Router com Client Components onde há estado/interação. Todas as chamadas à API passam por hooks customizados que encapsulam TanStack Query, garantindo cache, invalidação e loading states consistentes.

### TanStack Table + Paginação Server-Side

A tabela do dashboard usa TanStack Table v8 com `manualPagination: true` — toda a paginação, busca, filtro por status e ordenação são resolvidos no servidor. O endpoint `GET /entities` aceita `page`, `limit`, `status`, `search` e `sort`, e retorna além dos dados paginados um objeto `summary` com contadores globais (total, ativos, suspensos, eventos críticos, próximos do limite) usado nos KPIs sem necessidade de request extra. A busca no input é debounced (300ms) para evitar requests a cada tecla, e o hook usa `placeholderData: keepPreviousData` do TanStack Query para manter os dados da página anterior visíveis enquanto a nova carrega (com opacidade reduzida como feedback visual).

---

## Concorrência e idempotência

O endpoint `POST /events` é o coração do sistema e resolve três problemas simultaneamente:

### 1. Idempotência por `external_id`

O campo `external_id` tem constraint `UNIQUE` no banco. O fluxo é:

1. **Verificação rápida** antes da transação: `findUnique({ where: { externalId } })`. Se existe, retorna `200` com o evento original — sem abrir transação nem adquirir lock.
2. **Proteção contra race condition**: se duas requests passarem pela verificação ao mesmo tempo, a constraint UNIQUE do banco rejeita a segunda com `P2002`. O erro é capturado e tratado como duplicata.

Essa abordagem em duas camadas (cache check + constraint) garante idempotência mesmo sob alta concorrência, sem locks desnecessários para o caso comum (duplicatas).

### 2. Lock pessimista na entidade

Dentro da transação, a entidade é lida com `SELECT FOR UPDATE`. Isso trava a linha no PostgreSQL até o fim da transação, impedindo que duas requests concorrentes leiam o mesmo `critical_events_count` e ambas decidam não suspender.

### 3. Suspensão atômica

A verificação do limite e a atualização do status acontecem na mesma transação:

```
BEGIN
  SELECT ... FOR UPDATE              -- trava a entidade
  INSERT INTO events (...)           -- cria o evento
  UPDATE entities SET status = ...   -- suspende se atingiu o limite
COMMIT
```

Se o limite for atingido, o status muda para `suspended` dentro da mesma transação que criou o evento. Não há janela onde outro evento poderia ser aceito entre a verificação e a suspensão.

---

## Streaming (SSE)

### Por que SSE em vez de WebSocket?

- **Unidirecional**: o frontend só precisa receber eventos, não enviar. SSE é mais simples para esse caso.
- **Reconexão nativa**: o `EventSource` do browser reconecta automaticamente ao perder conexão.
- **Compatibilidade**: funciona sobre HTTP/1.1 padrão, sem upgrade de protocolo.

### Arquitetura

```
POST /events → EventService.create() → eventBus.emit('new-event', data)
                                              ↓
GET /events/stream → EventSource ← eventBus.on('new-event', write)
```

O backend usa um `EventEmitter` do Node.js como barramento interno. Quando um evento é criado com sucesso, ele é emitido no barramento. Cada conexão SSE registra um listener que escreve no stream do cliente.

**Heartbeat**: a cada 30 segundos, um comentário SSE (`:heartbeat\n\n`) é enviado para evitar que proxies fechem conexões ociosas.

**Cleanup**: quando o cliente desconecta, o listener é removido do barramento e o intervalo do heartbeat é limpo, evitando memory leaks.

**Limitação**: como usa `EventEmitter` local, o SSE só funciona em instância única. Em produção com múltiplos servidores, seria necessário Redis Pub/Sub ou similar.

### Frontend

O hook `useEventStream` gerencia a conexão SSE com:

- Buffer circular de 100 eventos (evita consumo crescente de memória)
- Deduplicação por `event.id` (proteção contra re-entrega)
- Backoff exponencial na reconexão (1s → 2s → 4s → ... → 30s max)
- Controles de pause/resume/clear

---

## Performance

### Índices

O schema define índices estratégicos:

| Índice                          | Finalidade                                           |
| ------------------------------- | ---------------------------------------------------- |
| `entities(status)`              | Filtro por status na listagem                        |
| `events(entity_id, created_at)` | Listagem de eventos por entidade, ordenados por data |
| `events(type, created_at)`      | Ranking: busca eventos críticos dos últimos 7 dias   |
| `events(external_id)` UNIQUE    | Idempotência: lookup rápido por external_id          |

### Agregações eficientes

A listagem de entidades usa subqueries correlacionadas em vez de N+1:

```sql
SELECT e.*,
  (SELECT COUNT(*) FROM events WHERE entity_id = e.id) AS total_events,
  (SELECT MAX(created_at) FROM events WHERE entity_id = e.id) AS last_event_at
FROM entities e
```

O PostgreSQL resolve cada subquery usando o índice `events(entity_id, created_at)`, resultando em index-only scans para entidades com muitos eventos.

### Ranking

O ranking dos últimos 7 dias usa `INNER JOIN` com filtro temporal + `GROUP BY`, resolvido pelo índice composto `events(type, created_at)`. O PostgreSQL filtra primeiro por `type = 'critical'` e depois pelo range de datas, tudo via índice.

---

## O que faria diferente em produção

1. **Redis Pub/Sub para SSE**: substituir o `EventEmitter` local por Redis para suportar múltiplas instâncias do backend.

2. **Rate limiting**: proteger o `POST /events` com rate limiting por IP/token para evitar abuso.

3. **Materializar o ranking**: para volumes muito grandes, pré-computar o ranking em uma tabela materializada atualizada por cron ou trigger, em vez de calcular a cada request.

4. **Observabilidade**: logs estruturados (pino/winston), métricas de latência por endpoint, e tracing distribuído para debugar problemas em produção.

5. **Cache HTTP**: adicionar `Cache-Control` e `ETag` nas rotas de listagem para reduzir carga no banco quando o frontend re-fetcha.
