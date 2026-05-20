# Handoff — Holocron Sentinel (Frontend)

> Pacote de design para implementação do frontend do desafio fullstack **Holocron Sentinel — Sistema de Monitoramento**.
> O backend já está desenvolvido. Este handoff cobre **apenas o frontend**.

---

## 1. Visão Geral

O **Holocron Sentinel** é um sistema de monitoramento operacional. Operadores acompanham entidades estratégicas (planetas, bases, naves) e os eventos associados a elas, em tempo real, via:

- **Dashboard** — listagem agregada de entidades
- **Detalhe da entidade** — histórico de eventos + gráfico de atividade
- **Registrar evento** — formulário manual com semântica de idempotência
- **Feed em tempo real** — stream contínuo de eventos (SSE)
- **Ranking** — entidades com mais eventos críticos em uma janela temporal

Stack-alvo conforme o desafio: **Next.js + TypeScript**.

---

## 2. Sobre os arquivos deste pacote

Os arquivos HTML/CSS/JSX **são protótipos de design, não código de produção**. Eles foram construídos com React (CDN) + Babel inline apenas para exibir o comportamento visual e a interação. **Não copie-os direto** — implemente os designs no projeto Next.js com os padrões e bibliotecas adotados pela equipe.

Use os arquivos como:

- referência visual pixel-perfect (cores, espaçamento, tipografia)
- referência de comportamento (estados, animações, microinterações)
- referência de copy (textos em PT-BR já redigidos)

| Arquivo                   | O que contém                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `Holocron Sentinel.html`  | Entry point — abra para ver o protótipo rodando                                            |
| `styles.css`              | Todos os design tokens e estilos de componente                                             |
| `app.jsx`                 | Router + estado global + simulação de stream                                               |
| `components/sidebar.jsx`  | Sidebar de navegação                                                                       |
| `components/ui.jsx`       | Helpers visuais reutilizáveis (badges, ícones, toast, JSON view, EmptyState, formatadores) |
| `pages/dashboard.jsx`     | Tela: Dashboard                                                                            |
| `pages/entity-detail.jsx` | Tela: Detalhe da entidade                                                                  |
| `pages/event-form.jsx`    | Tela: Registrar evento                                                                     |
| `pages/feed.jsx`          | Tela: Feed em tempo real                                                                   |
| `pages/ranking.jsx`       | Tela: Ranking                                                                              |
| `data/mock.js`            | Mock data + comentário documentando o schema                                               |
| `challenge-brief.md`      | Cópia do enunciado do desafio                                                              |

---

## 3. Fidelidade

**Alta fidelidade (hi-fi).** Cores, espaçamentos, tamanhos, raios de borda, sombras, fontes e animações são finais. Implemente pixel-perfect.

Caso o projeto já tenha um design system instalado, reaproveite os primitivos (Button, Input, Card, etc.) — mas faça-os corresponder ao look-and-feel deste handoff.

---

## 4. Schema do backend (rigorosamente seguido pelo design)

> O frontend NUNCA inventa campos que não existem no backend. Os únicos campos derivados são:
>
> - **agregações retornadas pelos endpoints de listagem/ranking** (`total_events`, `last_event_at`, `crit_7d`)
> - **joins puramente do frontend** (`entity_name` em um evento, derivado de `entity_id`)

### Entidade

| Campo                   | Tipo                      | Notas          |
| ----------------------- | ------------------------- | -------------- |
| `id`                    | string                    | ex: `ENT-7012` |
| `name`                  | string                    |                |
| `status`                | `'active' \| 'suspended'` |                |
| `critical_events_count` | number                    |                |
| `created_at`            | ISO datetime              |                |
| `updated_at`            | ISO datetime              |                |

**Agregações retornadas em `GET /entities`** (presumidas, conforme o brief):

- `total_events` — total de eventos da entidade
- `last_event_at` — timestamp do último evento (nullable)

**Agregação retornada em `GET /entities/ranking`**:

- `crit_7d` — eventos críticos nos últimos 7 dias (também pode ser `24h` / `30d` conforme janela)

### Evento

| Campo         | Tipo                                | Notas                 |
| ------------- | ----------------------------------- | --------------------- |
| `id`          | string                              | ex: `EVT-0820135`     |
| `entity_id`   | string                              | FK para entidade      |
| `external_id` | string                              | chave de idempotência |
| `type`        | `'info' \| 'warning' \| 'critical'` |                       |
| `payload`     | JSON                                | livre                 |
| `created_at`  | ISO datetime                        |                       |

**Limite crítico:** `10` eventos críticos suspendem a entidade automaticamente.

---

## 5. Design Tokens

Todos os valores são `oklch`/`hex` finais. Os tokens estão consolidados em `styles.css` no `:root`. Recomenda-se reproduzi-los em um arquivo `tokens.css` ou no `tailwind.config.ts` do projeto Next.js.

### Cores

| Token             | Valor                    | Uso                                                                                                |
| ----------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `--brand`         | `#FAE231`                | Cor primária — destaques, KPI hero, highlight de novos eventos, top-1 do ranking, linha do gráfico |
| `--brand-ink`     | `#1A1A0C`                | Texto sobre `--brand`                                                                              |
| `--brand-soft`    | `#FFF8C2`                | Highlight background ao receber evento novo no feed                                                |
| `--bg`            | `#FAFAF7`                | Background da aplicação                                                                            |
| `--surface`       | `#FFFFFF`                | Surface de cards                                                                                   |
| `--surface-2`     | `#F5F4EE`                | Surface secundária (chip group, hover row)                                                         |
| `--border`        | `#E8E6DE`                | Bordas padrão                                                                                      |
| `--border-strong` | `#D8D5CA`                | Bordas em hover/focus                                                                              |
| `--text`          | `#0F1115`                | Texto principal                                                                                    |
| `--text-muted`    | `#6B6B63`                | Texto secundário                                                                                   |
| `--text-faint`    | `#9C9B92`                | Texto terciário / placeholders                                                                     |
| `--info`          | `#2563EB` / bg `#EFF4FF` | Severidade info                                                                                    |
| `--warning`       | `#B45309` / bg `#FEF6E1` | Severidade warning                                                                                 |
| `--critical`      | `#B91C1C` / bg `#FDECEC` | Severidade critical                                                                                |
| `--success`       | `#15803D` / bg `#E8F5EC` | Sucesso / status ativo                                                                             |

### Tipografia

- **Sans:** `Geist` (400/500/600/700) — Google Fonts
- **Mono:** `Geist Mono` (400/500/600) — IDs, timestamps, código, números tabulares
- `font-feature-settings: "tnum"` para tabular nums em valores numéricos

| Uso                | Tamanho | Peso    | Tracking         |
| ------------------ | ------- | ------- | ---------------- |
| Page title         | 22px    | 600     | -0.02em          |
| Card title         | 14px    | 600     | -0.01em          |
| KPI value          | 30px    | 600     | -0.03em          |
| Body               | 13–14px | 400/500 | -0.005em         |
| Table header       | 11.5px  | 500     | 0.04em uppercase |
| Mono (IDs, código) | 11–13px | 400/500 | —                |

### Espaçamento, raio, sombra

- `--radius-sm: 6px`, `--radius: 10px`, `--radius-lg: 14px`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg` — definidos em `styles.css`
- Sidebar: **264px**

### Iconografia

Ícones inline em SVG (24×24, stroke 1.6). Catálogo em `components/ui.jsx`. Recomenda-se substituir por uma lib (ex: `lucide-react`) preservando o conjunto: `dashboard`, `feed`, `form`, `ranking`, `search`, `x`, `check`, `alert`, `info`, `pause`, `play`, `sun`, `moon`, `chevron-right`, `chevron-down`, `filter`, `send`, `lightning`, `shield`, `external`, `more`, `refresh`, `pulse`, `user`, `back`, `trash`, `copy`, `circle-dot`.

---

## 6. Telas

### 6.1 Dashboard (`/`)

**Endpoint consumido:** `GET /entities` — retorna entidades com agregações.

**Layout:**

- Header sticky: título "Entidades monitoradas" + subtítulo + pill "Sistema operacional" + botões "Abrir feed" (ghost) + "Registrar evento" (primary)
- Linha de 4 KPIs (grid `repeat(4, minmax(0, 1fr))`, gap 14px):
  1. **Entidades ativas** (`hero`, fundo `--brand`) — `{active} / {total}` + delta semanal
  2. **Suspensas** — `{suspended}`
  3. **Próximas do limite** — count de entidades ativas com `critical_events_count >= 70% * 10`
  4. **Eventos críticos (total)** — soma
- Card de listagem com:
  - **Filter bar:** busca (nome ou ID), chip-group de status (Todas / Ativas / Suspensas com counts), ordenação (ameaça / total eventos / mais recente / nome)
  - **Tabela** com colunas: Entidade (avatar com iniciais + nome + ID), Status (badge), Eventos críticos (threat meter), Total eventos (mono, right-aligned), Último evento (relative time), Ação (Suspender/Reativar)
  - Click na linha → drill-down para `/entities/[id]`
  - **Empty state** quando filtros não retornam resultados

**Estados:**

- Loading: skeleton rows (não implementado no protótipo — adicione)
- Empty (sem entidades): EmptyState com CTA "Criar primeira entidade"
- Error: alert vermelho com retry

**Componente `ThreatMeter`** (ver `components/ui.jsx`):

- Barra horizontal 80px com cor que varia: verde (< 50%), âmbar (50–99%), vermelho (≥ 100%)
- Texto `{count}/10` em mono

---

### 6.2 Detalhe da entidade (`/entities/[id]`)

**Endpoints consumidos:**

- `GET /entities/[id]` — dados da entidade
- `GET /entities/[id]/events?limit=12` — histórico paginado

**Layout:**

- Breadcrumb: `Dashboard / {entity.name}`
- Header: back-button, avatar (44px) com iniciais, título com nome + status badge, subtítulo "ID · criada em DD/MM/YYYY", ações "Suspender/Reativar" + "Registrar evento" (disabled se suspensa)
- **Alerts contextuais:**
  - Vermelho se `status === 'suspended'`
  - Âmbar se `critical_events_count >= 7` e ativa
- **Grid de 2 colunas** (1fr 320px):
  - **Coluna principal:**
    - 3 KPI cards (Eventos totais / Eventos críticos com meter / Últimas 24h com breakdown)
    - **Gráfico de atividade últimas 24h** — ver §7
    - **Histórico de eventos** — lista expandível (click para ver `payload` em JSON viewer)
  - **Coluna lateral (sticky):**
    - Card "Identificação" com info-list (ID, Status, Eventos críticos, Criada em, Atualizada em, Último evento)
    - Card "Política de suspensão" com explicação + ThreatMeter

**Estados:**

- Entidade inexistente: EmptyState
- Sem eventos: EmptyState dentro do card de histórico

---

### 6.3 Registrar evento (`/events/new`)

**Endpoint consumido:** `POST /events`

**Layout:** grid `1fr 360px`

- **Coluna principal — Card "Novo evento":**
  - Banner de resultado da última submissão (sucesso / duplicado / erro / suspensa)
  - Field: **Entidade** (select com optgroup "Ativas" / "Suspensas (somente leitura)")
  - Field: **external_id** (input mono + botão "gerar aleatório")
  - Field: **Tipo do evento** (3 radio cards lado a lado: Info / Warning / Critical com TypeBadge + descrição)
  - Field: **Payload (JSON)** — textarea mono, validação de JSON em tempo real
  - Footer: botão "Reusar último" (preenche com dados da última submissão para testar idempotência) + botão "Enviar evento" (primary, spinner durante submit)
- **Coluna lateral:**
  - Card "Submissões recentes" (in-memory, sessão)
  - Card "Como funciona a idempotência" (texto explicativo)

**Validações (client-side):**

- `entityId` obrigatório
- `external_id` obrigatório, regex `/^[a-zA-Z0-9_\-:.]+$/`
- `payload` obrigatório válido como JSON objeto (não array, não null)

**Respostas tratadas:**
| Resposta do backend | Banner exibido | Toast |
|---|---|---|
| `201 Created` | Verde "Evento registrado com sucesso" + event_id | success |
| `200 OK + duplicate flag` (idempotência) | Âmbar "Evento duplicado — idempotência aplicada" referenciando o evento original | warning |
| `409 Conflict` (entidade suspensa) | Vermelho "Evento rejeitado — entidade suspensa" | error |
| Outras falhas | Vermelho com mensagem do backend | error |

**Toast usage:** `pushToast({ kind, title, desc })` — descrito em `components/ui.jsx` (`useToasts` hook).

---

### 6.4 Feed em tempo real (`/feed`)

**Endpoint consumido:** `GET /events/stream` (Server-Sent Events).

**Layout:**

- Header: título + subtítulo + pill de status do stream (verde "Stream conectado" / âmbar "Pausado" / âmbar "Reconectando..." / vermelho "Desconectado") + botões "Pausar/Retomar" + "Limpar"
- Card com:
  - **Controls:** chip-group de filtro por severidade com counts (Tudo / Info / Warning / Critical) + texto mono "GET /events/stream · N eventos buffered"
  - **Feed list:** linhas com grid `80px 32px 1fr auto`:
    - Tempo (mono, ex: `12:34:56`)
    - Ícone colorido por severidade
    - Título "Evento {Type} em {entity_name}" + meta (TypeBadge + `external_id` em código + `EVT-id`)
    - Botão "Payload" / "Ocultar" — expande JsonView abaixo
  - **Animação:** novos eventos têm classe `.feed-row.new` por 1.6s — animação keyframe `flash` (background `--brand-soft` → transparente)
- Scrim no rodapé: "Buffer limitado a 100 eventos · reconexão automática habilitada"

**Comportamento esperado de SSE:**

- Conectar via `EventSource('/events/stream')`
- `onmessage` → parse JSON, prepend ao buffer, limitar a 100 itens
- `onerror` → atualizar status para "reconnecting", retry com backoff exponencial (1s, 2s, 4s, 8s, max 30s)
- Pausa: fechar `EventSource`; Retomar: reabrir
- **Deduplicação:** se o mesmo `event.id` chegar duas vezes, ignorar (último evento prevalece)

**Estado vazio:** "Aguardando eventos..." se stream conectado e buffer vazio.

---

### 6.5 Ranking (`/ranking`)

**Endpoint consumido:** `GET /entities/ranking?window=24h|7d|30d`

**Layout:**

- Header com chip-group de janela (24h / 7 dias / 30 dias)
- 3 KPIs: Entidade mais crítica (hero amarelo) / Total no período / Entidades no ranking
- Card "Top 12":
  - Subtítulo mostra endpoint chamado
  - Pill "atualizado há Ns"
  - Linhas: grid `36px 1fr 140px 220px 90px`
    - Posição (1, 2, 3, ... — top-1 com background `--brand`)
    - Entidade (avatar + nome + ID)
    - Status badge
    - Barra horizontal proporcional (vermelha; top-1 com gradient critical→brand)
    - "{n} evt" em mono
  - Click na linha → drill-down

**Estado vazio:** "Sem eventos críticos no período".

---

## 7. Gráfico de atividade (24h)

Componente reutilizável `HourlyChart` em `pages/entity-detail.jsx`. Recriar como componente próprio.

**Props:** `hourly: Array<{ info, warning, critical, total }>` — 24 buckets, do mais antigo (-24h) ao mais recente (agora).

**Especificação visual:**

- ViewBox: `0 0 600 220` com `preserveAspectRatio="none"`
- Canvas height: **220px** (cor de fundo: surface — segue o tema light do app)
- Padding interno: `padX=8 padTop=44 padBot=14`
- **Linha:** stroke `#FAE231` (brand), `strokeWidth=1.5`, `vectorEffect="non-scaling-stroke"` para manter espessura constante apesar do `preserveAspectRatio=none`
- **Suavização:** interpolação Catmull-Rom → Bezier com **tensão `/8`** (menor que `/6` típico para evitar overshoot nos picos)
- **Headroom:** `peak * 1.4` no denominador do yScale → garante ~40% de espaço acima do pico
- **Área:** gradient `#FAE231` (55% opacity no topo → 0% na base)
- **Grid:** 3 linhas horizontais tracejadas (25%, 50%, 75%), `stroke-dasharray: 2 4`, cor `--border`

**Animação de entrada (mount-only):**

- A linha: medida com `getTotalLength()`, anima `stroke-dashoffset` de `len` para `0` em 1.1s `cubic-bezier(0.22, 0.61, 0.36, 1)`
- A área: opacity 0 → 1 em 1.3s ease-out com delay 0.15s
- **Crítico:** ao final, limpar `stroke-dasharray` e `transition` inline para que updates posteriores (novos eventos via stream) não re-disparem a animação. Implementado com `useEffect(..., [])` + `setTimeout` cleanup.

**Hover/tooltip:**

- `onMouseMove` na chart-canvas: converter `clientX` → índice de bucket (0–23)
- Renderiza:
  - `<line>` vertical guia tracejada na posição do bucket
  - `<div className="chart-tooltip">` flutuante com:
    - Timestamp ("última hora" / "há Nh")
    - Total / Info / Warning / Critical em mono, com labels coloridas por severidade
  - Tooltip posicionado: `left = bucketX_em_pixels`, `top = lineY_em_pixels`, com `transform: translate(-50%, -100%)` e seta CSS via `::after`
- `onMouseLeave` → limpa hover

**Stats no header do gráfico:**

- 4 valores em mono: Total, Pico/h, Warning (cor âmbar), Critical (cor vermelha)

---

## 8. Estado global e comportamentos transversais

### Estado global esperado

| Estado              | Tipo           | Fonte                | Vida                                     |
| ------------------- | -------------- | -------------------- | ---------------------------------------- |
| `entities`          | `Entity[]`     | `GET /entities`      | revalidar com SWR/React Query a cada 30s |
| `events` (live)     | `Event[]`      | SSE `/events/stream` | em memória, limitado a 100               |
| `recentSubmissions` | `Submission[]` | local (form)         | sessão                                   |
| `toasts`            | `Toast[]`      | local                | auto-dismiss 4.2s                        |

Stream **NÃO** deve atualizar a tabela do dashboard em tempo real direto — é preferível revalidar via SWR/React Query (e.g., on focus, on interval) para manter a consistência. Caso decida fazer o "live patching", garanta que rebatimentos (`critical_events_count`, `last_event_at`, `total_events`) sejam aplicados na entidade certa.

### Toggle de status (suspender/reativar)

- **Suspender ativa** → `PATCH /entities/[id]` body `{ status: 'suspended' }`
- **Reativar suspensa** → `PATCH /entities/[id]` body `{ status: 'active', reset_counter: true }` (zera o contador crítico — padrão de "nova janela operacional")
- Otimista: aplique localmente antes do response; reverta em caso de erro.

### Idempotência (form de evento)

- Sempre que o usuário re-submete o mesmo `external_id` para a mesma entidade, o backend retorna o evento original (status 200 + flag `duplicate: true` ou status 201 — alinhe com o backend).
- O banner âmbar referencia o `event_id` original e o `first_seen_at`.

---

## 9. Animações e microinterações

| Onde                            | Propriedade                   | Duração       | Easing                              |
| ------------------------------- | ----------------------------- | ------------- | ----------------------------------- |
| Pill live "Sistema operacional" | `box-shadow` pulse            | 1.6s infinite | linear                              |
| Botão hover                     | `background-color`            | 120ms         | default                             |
| Filter chip selection           | `box-shadow` + `background`   | 120ms         | default                             |
| Input focus                     | `border-color` + `box-shadow` | 120ms         | default                             |
| Novo evento no feed             | `background` flash            | 1.6s          | ease-out                            |
| Gráfico — linha draw-on         | `stroke-dashoffset`           | 1.1s          | `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| Gráfico — área fade-in          | `opacity`                     | 1.3s          | ease-out (delay 0.15s)              |
| Toast entrada                   | `translateY + opacity`        | 200ms         | ease-out                            |
| Spinner                         | `rotate(360deg)`              | 700ms         | linear infinite                     |

---

## 10. Conteúdo / Copy (PT-BR)

- Idioma da interface: **Português brasileiro**
- Termos técnicos do schema (`external_id`, `payload`, `status`, etc.) mantidos em inglês onde apropriado
- Tons:
  - Status pills, KPIs, page titles: descritivos e curtos
  - Alerts: explicam o que aconteceu + consequência
  - Empty states: 1 frase descritiva + 1 CTA quando aplicável
- Pluralização cuidadosa (ex: "1 evento" vs "12 eventos")

---

## 11. Acessibilidade

- Botões ícone-only têm `title` para tooltip nativo. Em produção, considere `aria-label`.
- Inputs do form têm `label` clicável.
- Cores de severidade não dependem apenas de cor — também há ícone + label textual.
- Linhas de tabela clicáveis: considere adicionar `role="button"` e `tabIndex={0}` + `onKeyDown` para Enter/Space.
- Toasts: anuncie via `role="status"` ou `aria-live="polite"`.

---

## 12. Responsividade

O protótipo é desktop-first (mínimo 1280px confortável). Para responsivo:

- Sidebar: colapsar para off-canvas em viewport < 1024px (drawer com botão hambúrguer no header)
- KPIs: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`
- Tabela do dashboard: rolagem horizontal interna em telas pequenas (`.table-wrap { overflow-x: auto }`)
- Detail page: grid `1fr 320px` → `1fr` (uma coluna) em < 1024px; sidebar de identificação vira card depois do gráfico
- Form: `1fr 360px` → `1fr` em < 1024px (cards laterais movem para baixo)
- Feed: layout já é mobile-friendly

---

## 13. Critérios técnicos esperados (Next.js + TypeScript)

Sugestões compatíveis com o brief do desafio:

- **Roteamento:** App Router (Next.js 14+) com `app/dashboard`, `app/entities/[id]`, `app/events/new`, `app/feed`, `app/ranking`
- **Server Components onde fizer sentido** (telas com fetch puro); **Client Components** para Feed, Form e Detail (estado + interação)
- **Data fetching:** SWR ou TanStack Query — `revalidateOnFocus: true`, `dedupingInterval: 2000`
- **SSE no cliente:** `EventSource` direto em um Client Component dentro de um hook customizado `useEventStream()`
- **Forms:** `react-hook-form` + `zod` (schema de validação derivado do schema do backend)
- **UI:** opcional — `@radix-ui` headless + Tailwind para implementar os tokens. Ou um design system existente da empresa.
- **Estado global:** evitar Redux/Zustand; basta SWR cache + estado local. Toasts via Sonner ou Radix.
- **Testes:** Vitest + React Testing Library para componentes; Playwright para fluxos críticos (idempotência + auto-suspensão).

---

## 14. Pontos de atenção

1. **Schema rigoroso.** Não acrescente campos visíveis ao usuário que não venham do backend. Os únicos derivados aceitos são `total_events`, `last_event_at`, `crit_7d` (vêm das agregações) e `entity_name` (join no frontend).
2. **Idempotência visível.** O fluxo de "evento duplicado" é um diferencial do desafio — implemente o banner âmbar com referência ao evento original. Não trate como erro.
3. **Reconexão SSE.** Trate desconexões com retry exponencial e atualize o pill de status do stream.
4. **Auto-suspensão.** Quando o 10º evento crítico chega via stream, a entidade muda de `active` para `suspended` — atualize a UI e dispare um toast.
5. **Linha do gráfico:** atenção ao overshoot da curva Bezier (vide §7) e ao timing da animação de entrada (deve rodar apenas no mount).

---

## 15. Próximos passos sugeridos (não no escopo do desafio)

- Skeleton loaders em todas as listas
- Paginação real no histórico de eventos da entidade
- Filtros avançados no Feed (por entidade, por external_id)
- Exportação CSV do histórico
- Dark theme (foi removido do escopo a pedido — mas todos os tokens já estão em `:root`, basta reintroduzir o seletor `[data-theme="dark"]`)
- Notificações desktop quando uma entidade é auto-suspensa
- Métricas Prometheus/OpenTelemetry no cliente para latência da UI sob streaming
