# DevLog — Soluções Técnicas

> Documentação incremental do projeto. Cada entrada segue o formato:
> **Local (tela/módulo/funcionalidade)** → solução aplicada, conceitos envolvidos, regras de negócio e detalhes técnicos.
> Atualizado a cada funcionalidade entregue.

---

## Raiz do repositório — Monorepo com npm workspaces

**Solução:** um único repositório git com `apps/api` (NestJS) e `apps/web` (Next.js), orquestrado por [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) declarados no `package.json` da raiz (`"workspaces": ["apps/*"]`).

**Conceitos:**
- *Monorepo*: os dois apps versionam juntos e compartilham um único `node_modules` na raiz (hoisting). `npm install` na raiz instala tudo.
- Scripts de conveniência na raiz delegam para os workspaces via `npm run <script> --workspace <nome>` (ex: `npm run dev:api`).
- Não usamos Turborepo/Nx de propósito — arroz com feijão: para 2 apps, npm workspaces resolve sem camada extra de ferramenta.

**Regras:**
- Dependências de cada app ficam declaradas no `package.json` do próprio app, nunca na raiz (a raiz só orquestra).

---

## Raiz — Banco de dados via Docker Compose

**Solução:** `docker-compose.yml` sobe um PostgreSQL 16 (imagem alpine, mais leve) com usuário/senha/banco `devlog`, porta padrão 5432 e volume nomeado `devlog_pgdata`.

**Conceitos:**
- *Volume nomeado*: os dados persistem fora do container — `docker compose down` não apaga o banco (só `down -v` apagaria).
- `restart: unless-stopped`: o banco volta sozinho quando o Docker inicia, sem precisar lembrar de subir.

**Como usar:** `npm run db:up` (ou `docker compose up -d`) na raiz.

---

## API — Prisma (schema + migrations)

**Local:** `apps/api/prisma/schema.prisma`

**Solução:** schema da spec do MVP + três adições para o POC: `User` (login), `AgendaItem` (agenda independente) e `userId` em `Project`/`Note`. Modelos de relatório (`Report`, `ReportItem`, `ReportProfile`) já existem no schema mas não são usados — evita migration disruptiva na fase 2.

**Conceitos:**
- *Migration* (`npx prisma migrate dev`): o Prisma diffa o schema contra o banco e gera SQL versionado em `prisma/migrations/`. O banco nunca é alterado na mão.
- *Status derivado da WorkSession*: `startedAt == null` → Planejada; `startedAt != null && endedAt == null` → Ativa; ambos preenchidos → Concluída. **Não é coluna no banco** — é calculado (na API nunca, no front via `sessionStatus()` em `lib/types.ts`). Menos estado = menos chance de inconsistência.
- Relação N-N `Task ↔ WorkSession` (`@relation("SessionTasks")`): uma sessão trabalha várias tasks, uma task aparece em várias sessões.

**Regras:**
- `AgendaItem.projectId` e `Note.projectId` são **opcionais**: o vínculo primário é `userId`. A agenda funciona como módulo à parte (item pessoal sem projeto).

---

## API — PrismaModule global

**Local:** `apps/api/src/prisma/`

**Solução:** `PrismaService` estende `PrismaClient` e conecta/desconecta nos hooks de ciclo de vida do Nest (`OnModuleInit`/`OnModuleDestroy`). O módulo é `@Global()`.

**Conceitos:**
- *Injeção de dependência do Nest*: services recebem o `PrismaService` pelo construtor; `@Global()` evita importar `PrismaModule` em cada feature module.
- Uma única instância de `PrismaClient` por processo (pool de conexões compartilhado).

---

## API — Autenticação (AuthModule)

**Local:** `apps/api/src/auth/`

**Solução:** registro/login com senha hasheada por **bcrypt** (10 salt rounds), **JWT** assinado pelo `@nestjs/jwt` (expira em 7d) e entregue num **cookie httpOnly** (`devlog_token`). Um **guard global** (`APP_GUARD`) protege todas as rotas; exceções são marcadas com o decorator `@Public()`.

**Conceitos:**
- *Hash de senha (bcrypt)*: a senha nunca é armazenada em claro; `bcrypt.compare` verifica sem descriptografar. Salt embutido protege contra rainbow tables.
- *JWT em cookie httpOnly*: o JS do browser não consegue ler o cookie → um XSS não rouba o token. `sameSite: 'lax'` mitiga CSRF básico. Em produção, ligar `secure: true` (https).
- *Guard global + metadata*: `JwtAuthGuard` registrado como `APP_GUARD` roda em toda rota; o `Reflector` lê o metadata `isPublic` posto pelo `@Public()` para liberar login/register/health. Seguro por padrão: rota nova já nasce protegida.
- *Decorator de parâmetro* `@CurrentUser()`: extrai o usuário que o guard anexou em `req.user` — controllers não mexem em `Request` direto.
- Detalhe TS: tipos usados em assinaturas decoradas precisam de `import type` (erro TS1272 com `isolatedModules` + `emitDecoratorMetadata`).

**Regras:**
- Login inválido responde a mesma mensagem para email inexistente e senha errada (não vaza qual falhou).
- `/auth/me` é a fonte de verdade da sessão para o front.

---

## API — Escopo por usuário (todos os módulos)

**Local:** `apps/api/src/*/**.service.ts`

**Solução:** toda query filtra pelo `userId` vindo do JWT. Recursos aninhados usam *ownership indireta*: `where: { id, project: { userId } }` — o grupo/task/sessão é meu se o projeto dele é meu. Antes de qualquer escrita, um `assertOwnership` privado confere e lança `NotFoundException`.

**Conceitos:**
- Responder **404 (e não 403)** para recurso de outro usuário: não revela que o recurso existe.
- A checagem fica no service (não no controller): impossível esquecer ao adicionar rota nova.

**Verificado no E2E:** segundo usuário registrado vê `[]` em `/projects`; requests sem cookie levam 401.

---

## API — Validação de entrada (DTOs)

**Local:** `apps/api/src/*/dto/`, `apps/api/src/main.ts`

**Solução:** `ValidationPipe` global com `whitelist: true` + DTOs com decorators do `class-validator` (`@IsEmail`, `@IsEnum(TaskStatus)`, `@Min(0)/@Max(100)` no progress etc.).

**Conceitos:**
- *Whitelist*: campos não declarados no DTO são descartados silenciosamente — cliente não injeta coluna extra (ex: mandar `userId` no body é ignorado).
- Enums do Prisma (`TaskStatus`, `TaskPriority`, `AgendaItemType`) são reutilizados nos DTOs — uma única fonte de verdade.
- `@IsOptional()` aceita `null` e `undefined` — usado em `groupId`/`projectId` para "desvincular" (mandar `null` limpa o vínculo).

---

## API — Sessões de trabalho (SessionsModule)

**Local:** `apps/api/src/sessions/`

**Solução:** endpoints específicos por transição de estado, em vez de um PATCH genérico: `POST /sessions/quick-start`, `POST /sessions/planned`, `POST /:id/start`, `POST /:id/capture`, `POST /:id/finish`, além de `GET /sessions/active` e `GET /sessions/planned`.

**Conceitos:**
- *Máquina de estados via endpoints*: cada transição valida suas pré-condições (`start` exige `startedAt == null`; `finish` exige sessão ativa) e responde `409 Conflict` se violada. Um PATCH genérico permitiria estados inválidos.
- *Captura rápida concatena*: `capture` faz append (`notas antigas + '\n' + novas`), nunca sobrescreve — o fluxo da spec é "anotar sem pensar" durante a sessão.
- **Regra de negócio:** uma sessão ativa por usuário. `assertNoActive` responde 409 com mensagem clara.
- Encerramento: nenhum campo obrigatório (regra da spec — salva em branco se preciso). `tasks: { set: [...] }` substitui os vínculos N-N de uma vez.

---

## API — Agenda (AgendaModule, módulo independente)

**Local:** `apps/api/src/agenda/`

**Solução:** CRUD de `AgendaItem` + endpoint agregador `GET /agenda?month=YYYY-MM` que devolve `{ items, plannedSessions }` — itens do mês e sessões planejadas (`startedAt == null` com `plannedFor` no mês) numa resposta só.

**Conceitos:**
- *Agregação no backend*: o calendário precisa das duas fontes; agregar na API evita duas requests e mantém a regra ("o que aparece na agenda") num lugar só.
- Range de mês calculado como `[primeiro dia, primeiro dia do mês seguinte)` — intervalo meio-aberto evita bug de último dia/hora.
- `Promise.all` para as duas queries em paralelo.

**Regras:**
- Item sem `projectId` = pessoal (ex: "estudar NestJS"). A agenda não depende de projeto para funcionar.

---

## Web — Tema dark (design tokens)

**Local:** `apps/web/src/app/globals.css`

**Solução:** dark only. Tokens como CSS variables no `:root` (mesma nomenclatura do shadcn/ui: `--background`, `--card`, `--primary`…), mapeados para classes Tailwind v4 via `@theme inline` (`--color-primary: var(--primary)` → `bg-primary`).

**Conceitos:**
- Paleta: camadas de cinza (`#0e0f12` fundo → `#16181d` card → `#1e2127` inputs/hover → `#262a31` borda) dão profundidade **sem sombras**; verde lima `#a3e635` é o único accent.
- *Regra de uso do lima*: só ação primária, estado ativo, timer e indicadores (dots, progresso). Nunca fundo de área grande — accent raro continua sendo accent.
- Tailwind v4: tema definido no CSS (`@theme`), sem `tailwind.config` para cores.
- Fonte Geist (via `next/font`) + mono para hashes de commit.

---

## Web — Componentes de UI

**Local:** `apps/web/src/components/ui/`

**Solução:** componentes estilo shadcn/ui escritos à mão: `button` (variantes com CVA), `card`, `badge`, `input`, `textarea`, `label`, `select`, `dialog` e `popover` (Radix por trás — acessibilidade de foco/ESC/overlay de graça).

**Conceitos:**
- *CVA (class-variance-authority)*: variantes declarativas (`variant`, `size`) viram classes; `cn()` (`clsx` + `tailwind-merge`) resolve conflitos de utilitários.
- **Select nativo estilizado** em vez de Radix Select: menos código e acessível por padrão — arroz com feijão. Dialog/Popover usam Radix porque modal/popover acessível na mão não vale a complexidade.

---

## Web — Cliente HTTP + React Query

**Local:** `apps/web/src/lib/api.ts`, `apps/web/src/hooks/use-*.ts`

**Solução:** wrapper único de `fetch` com `credentials: 'include'` (cookie JWT viaja sozinho) e erros convertidos em `ApiError` com a mensagem do NestJS. Por cima, **TanStack Query**: um hook por operação (`useProjects`, `useCreateTask`, `useQuickStart`…).

**Conceitos:**
- *Server state via React Query*: cache por `queryKey`, `staleTime` 30s, sem estado global manual.
- *Invalidation por prefixo*: mutações chamam `invalidateQueries({ queryKey: ['sessions'] })` — o fuzzy matching invalida lista, planejadas e ativa de uma vez. Mutações de sessão também invalidam `['agenda']` (sessões planejadas aparecem no calendário).
- `useActiveSession` com `refetchInterval: 60s`: badge do timer se corrige sozinho se a sessão for encerrada em outra aba.

---

## Web — Proteção de rotas (middleware)

**Local:** `apps/web/src/middleware.ts`

**Solução:** middleware do Next checa a **presença** do cookie `devlog_token`: sem cookie → redirect `/login`; com cookie em página pública → redirect `/`.

**Conceitos:**
- O middleware **não valida** o JWT (não tem o secret e não deve ter) — é só UX de redirect rápido. A segurança real é da API: token inválido → 401 em toda query.
- Route groups do App Router: `(auth)` para telas públicas com layout centralizado, `(app)` para o shell autenticado (sidebar + topbar). Parênteses não afetam a URL.

---

## Web — Fluxo global de sessão (topbar)

**Local:** `apps/web/src/components/sessions/` + `app/(app)/layout.tsx`

**Solução:** o layout autenticado monta em toda tela o botão **"Nova Sessão"** (popover com abas *Início rápido* / *Planejada*) e o **badge do timer** quando há sessão ativa (os dois se alternam: com sessão ativa o botão some).

**Conceitos:**
- *Início rápido em 2 cliques*: popover abre com o **último projeto usado** pré-selecionado (persistido em `localStorage`, chave `devlog:lastProject`) → "Iniciar agora".
- *Sessão planejada*: lista as sessões com `startedAt == null` ordenadas por `plannedFor`; iniciar só marca `startedAt` — tasks e notas já vêm do planejamento.
- *Timer*: `setInterval` de 1s força re-render e `formatElapsed` calcula o decorrido a partir de `startedAt` — o relógio é derivado, nada é persistido por tick.
- *Captura rápida*: popover no badge com duas textareas (notas/commits) → `POST /:id/capture` (append no servidor).
- *Encerramento*: dialog pré-preenchido com o que a sessão acumulou + checkboxes das tasks do projeto. Nenhum campo obrigatório.

---

## Web — Tela de Projeto (abas)

**Local:** `apps/web/src/app/(app)/projetos/[id]/page.tsx`

**Solução:** header com contadores + abas **Tasks / Sessões / Notas**. A aba ativa vive na URL (`?tab=sessoes`) via `router.replace` + `useSearchParams`.

**Conceitos:**
- *Estado na URL*: recarregar/compartilhar preserva a aba — e o botão voltar funciona como esperado.
- As abas reutilizam componentes (`TasksTab`, `SessionCard`, `NotesList`) que também servem às telas globais.

---

## Web — Tasks (aba do projeto)

**Local:** `apps/web/src/components/tasks/`

**Solução:** lista agrupada por Grupo (client-side, via `Map`), filtros de status/grupo (repassados como query params à API), badges de status/prioridade, barra de progresso lima e modal único de criar/editar (`task == null` → criar).

**Conceitos:**
- *Modal único criar/editar*: um `useEffect` no `open` sincroniza o formulário com a task em edição — um componente a menos para manter.
- Progresso como `<input type="range">` com step 5 — arroz com feijão, sem lib de slider.
- Task concluída ganha `line-through`; grupos são criados via `prompt()` nativo (POC).

---

## Web — Notas com markdown

**Local:** `apps/web/src/components/notes/`

**Solução:** editor com toggle **Escrever / Visualizar** — textarea mono + preview renderizado por `react-markdown`. Estilos de markdown próprios (classe `prose-devlog` no globals.css), sem plugin de tipografia.

**Conceitos:**
- `react-markdown` renderiza para React (sem `dangerouslySetInnerHTML` — sem risco de XSS por HTML na nota).
- Nota pode ser geral ou vinculada a projeto; na aba do projeto o vínculo vem travado (`fixedProjectId`).

---

## Web — Agenda (calendário próprio)

**Local:** `apps/web/src/app/(app)/agenda/page.tsx` + `components/agenda/`

**Solução:** grade mensal construída na mão com `date-fns` (`startOfWeek(startOfMonth)` → `endOfWeek(endOfMonth)` → `eachDayOfInterval`), sem lib de calendário. Painel lateral mostra o dia selecionado; dots coloridos por tipo de item + dot lima para sessão planejada; filtro Tudo / Só pessoais / por projeto.

**Conceitos:**
- *Semanas completas*: a grade sempre começa no domingo e termina no sábado — células "fora do mês" aparecem esmaecidas.
- Duas fontes de dados na mesma visão (itens + sessões planejadas), vindas do endpoint agregador — o front só filtra e distribui por dia com `isSameDay`.
- Item tem checkbox `done` (toggle via PATCH) e edição no clique.

**Regras:**
- Criar item com "Pessoal (sem projeto)" é o caminho padrão — projeto é opção, não obrigação.

---

## Verificação E2E realizada (27/07/2026)

Fluxo completo no browser: registro → login (cookie) → criar projeto → criar task (status/prioridade/progresso) → sessão rápida em 2 cliques → captura rápida (append confirmado) → encerrar com task vinculada e próximo passo → criar sessão planejada com task → sessão planejada visível na Agenda (28/07) → item pessoal "Estudar NestJS e Node com APIs" na Agenda (29/07, badge "pessoal") → nota com markdown renderizando (heading/lista/negrito/código).

Segurança: `GET /projects` sem cookie → 401; senha errada → 401 (mesma mensagem); segundo usuário registrado enxerga `[]` em `/projects`.
