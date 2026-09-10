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

## Melhorias e correções — lote 1 (01/08/2026)

**Bugs corrigidos:**
- *Timer zerado* ([active-session-badge.tsx](../apps/web/src/components/sessions/active-session-badge.tsx)): o **React Compiler** (ligado no `next.config`) memoizava `formatElapsed(startedAt)` pela dependência que enxerga (`startedAt`, estável) e ignorava o `new Date()` interno — travando o valor. Correção: `now` em estado, atualizado por `setInterval` a cada 1s e passado como argumento, virando dependência explícita que o compilador recalcula.
- *Encerrar sessão não atualizava a UI* ([api.ts](../apps/web/src/lib/api.ts)): `GET /sessions/active` sem sessão retorna `null` → corpo HTTP vazio → `res.json()` estourava → a query entrava em erro e o React Query **mantinha o dado antigo** em cache (badge não sumia; "encerrar" de novo dava 409). Correção: o cliente lê `res.text()` e só faz `JSON.parse` se houver conteúdo (corpo vazio → `null`). Além disso, `useFinishSession` faz `setQueryData(['sessions','active'], null)` para o badge sumir na hora.
- *Listas/contadores não atualizavam*: mutações de task/sessão/nota agora invalidam também `['projects']` (os contadores do card e do header do projeto vinham de lá).
- *Spellcheck e autocomplete*: `Input`/`Textarea` agora têm `spellCheck={false}` e `autoComplete="off"` por padrão (sobrescrevíveis), removendo o sublinhado vermelho e as sugestões do browser.

**Componente Select estilizado** ([select.tsx](../apps/web/src/components/ui/select.tsx)): trocado o `<select>` nativo (feio) por um componente próprio sobre **Radix Select**, combinando com o tema (chevron, check lima, dot de cor opcional). API simples via `options` para trocar os 7 call sites com baixo risco. Detalhe: Radix não aceita `value=""`, então traduzimos `'' ↔ '__empty__'` internamente para manter o "Sem projeto/Todos" funcionando.

**Copiar task como texto** ([task-text.ts](../apps/web/src/lib/task-text.ts)): `taskToText()` formata a task de forma legível (título, status+%, prioridade, grupo, descrição, notas — só campos preenchidos) para colar no Claude ou compartilhar. Botão de copiar no card (aparece no hover) e no dialog de edição. `copyText()` usa Clipboard API com fallback para `execCommand`.

**Projetos:** `description` (schema + form com campo maior) e **tags reutilizáveis com cor** (novo model `Tag` M2M com `Project`, escopado por usuário, `@@unique([userId,name])`). `TagPicker` cria/alterna tags e escolhe cor de uma paleta ([color-picker.tsx](../apps/web/src/components/ui/color-picker.tsx)). Projeto agora é editável (dialog único criar/editar). Abas Tasks/Sessões/Notas viraram um segmented control com aba ativa em **accent lima** (antes só uma barra cinza).

**Grupos:** ganharam `color` (opcional) e um **form de CRUD** (criar/editar/excluir com seletor de cor), substituindo o `prompt()`. A cor aparece como dot no header do grupo e no dropdown de seleção.

**Migration:** `20260801120000_project_desc_tags_group_color` (gerada via `prisma migrate diff` sem banco, por causa da instabilidade do Docker local; aplicada e validada no Postgres local). É aditiva/não-destrutiva (colunas nulas + tabelas novas) — o deploy aplica no Neon via `migrate deploy`.

**Ajustes visuais (lote 1b):**
- *Sidebar fixa* ([sidebar.tsx](../apps/web/src/components/layout/sidebar.tsx)): antes a `<aside>` era um flex item que esticava até a altura do conteúdo, então quando a lista de tasks rolava, o botão "Sair" (no rodapé da sidebar) saía da tela. Correção: `sticky top-0 h-screen self-start` — a sidebar passa a ter exatamente a altura da viewport e fica pinada no topo, com o conteúdo central rolando sozinho. `overflow-y-auto` no `<nav>` cobre telas muito baixas.
- *Identificação de grupo na task* ([tasks-tab.tsx](../apps/web/src/components/tasks/tasks-tab.tsx)): cada card ganhou uma **faixa vertical de 4px à esquerda na cor do grupo** (some quando a task não tem grupo/cor) + um **chip com dot e nome do grupo** ao lado do título. Reforça a identidade do grupo num relance, útil principalmente ao filtrar tasks de grupos misturados.

---

## Melhorias — lote 2 (05/08/2026)

**Projeto — Notas viram painel lateral** ([notes-panel.tsx](../apps/web/src/components/notes/notes-panel.tsx), [projetos/[id]/page.tsx](<../apps/web/src/app/(app)/projetos/[id]/page.tsx>)): a página do projeto agora tem só **duas abas** (Tasks/Sessões) num grid `lg:grid-cols-[1fr_19rem]`, com um **painel de "Notas & recados"** fixo à direita (empilha embaixo em telas < lg). O painel tem quick-add (Ctrl/Cmd+Enter) que cria um recado na hora (título = 1ª linha); clicar num recado abre o editor markdown completo. URLs antigas com `?tab=notas` caem em Tasks.

**Tasks — esconder concluídas por padrão** ([tasks-tab.tsx](../apps/web/src/components/tasks/tasks-tab.tsx)): checkbox "Mostrar concluídas" (off por padrão) filtra `CONCLUIDO` client-side; filtro de status explícito tem precedência. *Bug corrigido no caminho:* o `grouped` usava `visibleTasks` no corpo mas tinha `[tasks]` no array de dependências do `useMemo` — não recalculava ao marcar/desmarcar (mesma família do bug do timer). Corrigido para `[visibleTasks]`.

**Sessões — tasks com a cor do grupo** ([sessions.service.ts](../apps/api/src/sessions/sessions.service.ts), [session-card.tsx](../apps/web/src/components/sessions/session-card.tsx)): a query de sessão passou a incluir `group` nas tasks; os chips das tasks no card usam a cor do grupo (fundo/borda/texto tingidos).

**Modais — não fechar por engano** ([dialog.tsx](../apps/web/src/components/ui/dialog.tsx)): `DialogContent` bloqueia `onPointerDownOutside`/`onInteractOutside`/`onEscapeKeyDown` — clicar fora ou apertar Esc não fecha mais (evita perder edição). Fechar só pelo X ou Cancelar/Salvar.

**Agenda — sessões executadas (heatmap)** ([agenda.service.ts](../apps/api/src/agenda/agenda.service.ts), [agenda/page.tsx](<../apps/web/src/app/(app)/agenda/page.tsx>)): o endpoint do mês passou a devolver também `sessions` (executadas, `startedAt` no mês). No calendário, cada dia ganha um badge `n×` e um **fundo lima com intensidade proporcional** ao nº de sessões (estilo heatmap do GitHub); o painel do dia lista cada sessão feita (projeto, duração, horário e tasks coloridas por grupo).

---

## Calculadora de preço + padronização de botões (10/08/2026)

**Calculadora de precificação por projeto** — feature nova para sugerir quanto cobrar de clientes.

*Modelo* ([schema.prisma](../apps/api/prisma/schema.prisma), migration `20260805120000_calculadora_custos`): enums `CostCategory` (CUSTO/OUTROS/DEV/DESCONTO) e `CostKind` (FIXED/HOURLY); `CostItem` (por projeto), `CostTemplate` (reutilizável por usuário), `Project.marginPercent` (override), `User.defaultHourlyRate`/`defaultMargin` (defaults globais). Migração aditiva gerada via `migrate diff` (Docker-independente). *Atenção:* o `2>&1` no diff polui o .sql com banner do Prisma — gerar sempre com stdout puro; e se um `migrate deploy` falhar no meio, usar `migrate resolve --rolled-back` antes de re-aplicar.

*Backend* ([costs/](../apps/api/src/costs)): CRUD de itens por projeto, de templates e das settings globais, tudo escopado por usuário.

*Fórmula* ([calc.ts](../apps/web/src/lib/calc.ts)): `subtotal = custos + outros + mão de obra` (mão de obra = valor/hora × horas; horas nulas puxam da soma das sessões concluídas do projeto). `preço = subtotal × (1 + margem%) − descontos`. Cada categoria tem cor própria ("mais cores para informações"): Custo azul, Outros violeta, Dev lima, Desconto rosa.

*UI*: tela global **Calculadora** na sidebar (defaults + custos padrão reutilizáveis); no projeto, um **card resumido** ([calc-card.tsx](../apps/web/src/components/calc/calc-card.tsx)) acima de Notas & recados com preço sugerido + mini-breakdown colorido, e um **editor em tabela** ([calc-editor.tsx](../apps/web/src/components/calc/calc-editor.tsx)) com recálculo ao vivo, importação de padrões, edição de margem e descontos. Layout do projeto alargado (`max-w-6xl`). Verificado com o exemplo Moven-TCC: custos 100 + outros 40 + dev 150 = 290, +30% = **R$ 377**; com desconto de R$27 → R$ 350; margem 50% → R$ 408.

**Padronização dos botões de Tasks** ([tasks-tab.tsx](../apps/web/src/components/tasks/tasks-tab.tsx)): filtros, "Concluídas", "Grupo" e "Nova task" numa linha só, todos na mesma altura (h-9) dos selects. O antigo checkbox "Mostrar concluídas" virou um **botão toggle** ("Concluídas") que fica em accent lima (variant default, igual "Nova task") quando ativo.

**Ajustes da calculadora (11/08/2026):**
- *Campo numérico sem setinhas* ([number-input.tsx](../apps/web/src/components/ui/number-input.tsx)): `NumberInput` usa `type="text"` + `inputMode="decimal"` (a pedido, 13/08) — sem qualquer botão de incremento/decremento (nem nativo nem customizado), garantido em todo browser/OS; mantém o teclado numérico no mobile e a opção `onCommit` (commita no blur para não disparar request a cada tecla). Aplicado em todos os campos numéricos da calculadora.
- *Gestão vira aba* ([calc-tab.tsx](../apps/web/src/components/calc/calc-tab.tsx)): o antigo editor em dialog virou uma **terceira aba do projeto** (Tasks / Sessões / **Calculadora**), em tela cheia. Design refeito: custos **agrupados por categoria** (seções coloridas com subtotal por categoria), itens espaçosos com editar/excluir inline. Nessa aba **não há notas nem o totalizador** (a pedido). O card de resumo (`CalcCard`, agora com a **margem editável**) e as notas continuam nas abas Tasks/Sessões; o botão "Gerenciar" do card navega para `?tab=calc`. O `CalcEditor` (dialog) foi removido.

---

## Calculadora — cálculo por período + histórico de cobrança (13/08/2026)

**Contexto:** a mão de obra somava o **total** de horas de todas as sessões do projeto. Passou a poder trabalhar com **períodos** (intervalo de datas) e a guardar um **histórico de lançamentos** (ex: pagamentos).

*Modelo* ([schema.prisma](../apps/api/prisma/schema.prisma), migration `20260813120000_periodos_de_cobranca`): `PeriodCategory` (categoria com cor, reutilizável por usuário — `@@unique([userId,name])`, criada no espírito dos grupos de task) e `CostPeriod` (lançamento por projeto: `category?`, `label?`, `startDate`/`endDate`, `hours`/`amount` **snapshot**, `note?`). `categoryId` é `onDelete: SetNull` — excluir a categoria não apaga o histórico. Migração aditiva gerada via `migrate diff` e aplicada direto no Postgres do Docker + `migrate resolve --applied` (o `migrate dev` queria resetar o banco por causa de um checksum divergente na migration anterior — evitado para não perder dados locais).

*Backend* ([costs/](../apps/api/src/costs)): o `CostsModule` ganhou CRUD de `period-categories` (por usuário) e de `periods` (por projeto), tudo escopado por usuário com os mesmos `assert*` de ownership.

*Filtro de período* ([calc.ts](../apps/web/src/lib/calc.ts)): `sessionsToHours(sessions, range?)` e `sessionInRange()` — uma sessão conta se **começou** dentro de `[from, to]` (`to` inclusivo até o fim do dia). Range vazio = total do projeto (comportamento antigo preservado). O `autoHours` da aba passa a derivar do range selecionado.

*Snapshot vs. ao vivo:* `hours`/`amount` do lançamento são congelados no momento de salvar (registro de pagamento não muda se sessões forem editadas depois). Os detalhes ([period-details-dialog.tsx](../apps/web/src/components/calc/period-details-dialog.tsx)) ainda **listam ao vivo** as sessões que caíram no intervalo salvo, para conferência.

*UI* ([periods-section.tsx](../apps/web/src/components/calc/periods-section.tsx)): abaixo do formulário de adicionar custos, uma seção com **filtro de intervalo** (De/Até + horas do período), botão **"Salvar período"** (form inline pré-preenchido com horas e valor = horas × valor/hora padrão, editáveis), **histórico** clicável (dot da cor da categoria, rótulo, intervalo, horas, valor) com editar/excluir inline e **dialog de detalhes**. Categorias são criadas inline por um dialog ([period-category-dialog.tsx](../apps/web/src/components/calc/period-category-dialog.tsx)) espelhando o de grupo (nome + `ColorPicker`).

*Ajuste visual:* no card "Custos lançados" da aba, o título e "X h em sessões" voltaram para a **mesma linha** (era `flex-row` sozinho — sem `flex` — que empilhava; virou `flex items-center justify-between`).

**Redesenho do período — arquivar/limpar/reabrir (14/08/2026):** o período deixou de ser só um snapshot de valores e passou a **arquivar os custos lançados**. `CostItem` ganhou `periodId String?` (migration `20260814120000_arquivar_custos_no_periodo`): `null` = item ativo (na lista "Custos lançados"), preenchido = arquivado num período (fora do cálculo atual). Fluxo:
- *Salvar período* ([costs.service.ts](../apps/api/src/costs/costs.service.ts) `createPeriod`, transação): cria o lançamento e faz `updateMany` dos itens ativos → `periodId` do período, **limpando** a lista ativa. `listItems` passou a filtrar `periodId: null`.
- *Reabrir* (`POST /periods/:id/reopen`): devolve os itens para a lista ativa (`periodId → null`) e apaga o lançamento — é o "Editar" do histórico (volta pra área de trabalho, a pedido). *Excluir* apaga o lançamento **e** os itens arquivados nele.
- *Detalhes* ([period-details-dialog.tsx](../apps/web/src/components/calc/period-details-dialog.tsx)): lista os custos arquivados (o `include: { items }` acompanha o período) + botão "Reabrir para editar".
- *Horas informadas:* o campo "0.0h em sessões" e o prefill do formulário passaram a usar `result.devHoras` (mão de obra efetiva = horas digitadas nos itens Dev, caindo pras sessões só quando em branco), não mais o total bruto de sessões.

---

## Relatório semanal — geração do .docx via Python (20/08/2026)

**Coração da feature (fase 2):** gerar o relatório da faculdade preenchendo o template real do Word (`docxtpl`), sem recriar layout — só injetando dados. Escopo desta entrega: script Python + endpoint de geração (a tela de revisão/snapshot vem depois).

*Python isolado* ([apps/api/report/](../apps/api/report)): `gerar_relatorio.py` recebe `--template --input(json) --output`, faz `DocxTemplate(...).render(context)` e salva; erros vão pro stderr com exit != 0. Deps num **venv dedicado** no repo (`report/.venv`, `requirements.txt` = `docxtpl`), git-ignored. Template movido pra `report/templates/RAP-TDS-2026_013-template-docxtpl.docx`. Tags confirmadas por inspeção do OOXML: escalares (`grupo_turma`, `aluno`, `ra`, `curso`, `termo`, `semana`, `data`, `percent_total`, `orientador`, `coorientador`, `tema`, `area`) + duas tabelas com `{%tr for item in realizadas/proximas %}` (campos `item.tarefa/status/percent/justificativa`).

*Backend* ([reports/](../apps/api/src/reports)): `POST /projects/:id/reports/generate` recebe intervalo `{from,to}` (**seleção por datas**, a pedido) + overrides opcionais (`semana`, `data`, `percentTotal`). O service monta o `context`: `realizadas` = tasks com sessão executada em `[from,to]` (status derivado `progress==100 → Concluída`, senão `Em andamento`); `proximas` = tasks de sessões planejadas (`startedAt null`, `plannedFor > to`, status `Em espera`); `percent_total` = média de `progress` das tasks `status != FUTURO`. Escreve o context num JSON temp, chama o Python do venv via `execFile` (subprocesso), lê o `.docx` e devolve como `StreamableFile` (download). Caminhos configuráveis por env (`REPORT_PYTHON/SCRIPT/TEMPLATE_PATH`) com defaults resolvidos de `process.cwd()`; binário do venv é `Scripts/python.exe` (Win) ou `bin/python` (Linux). Cabeçalho vem do `ReportProfile` (upsert mínimo em `PUT /projects/:id/report-profile` pra deixar o fluxo testável — tela completa depois).

*Validado:* pipeline Python rodado contra o template real (dados injetados, zero tags Jinja residuais); API compila e sobe com as rotas mapeadas; endpoints 401 sem auth. **Deploy (resolvido 30/08/2026):** o `Dockerfile` do runner passou a instalar `python3`+`python3-venv`, copiar `apps/api/report/` e criar um venv Linux com `docxtpl` no build (`.venv`/`out` locais excluídos via `.dockerignore`). Validado buildando a imagem e rodando o script dentro do container (gerou o `.docx`). Caminhos default resolvem do `process.cwd()` (`/app/apps/api`) — sem env extra no Render.

---

## Relatório (front), dados do usuário e resumo (20/08/2026)

**Tela Relatório** ([relatorio/page.tsx](<../apps/web/src/app/(app)/relatorio/page.tsx>)): seleção de projeto → **config do cabeçalho** (o "JSON": aluno, RA, curso, orientadores, tema… — tudo que não vem de tasks/sessões, em [report-profile-form.tsx](../apps/web/src/components/reports/report-profile-form.tsx), salvo via `PUT /projects/:id/report-profile`) → intervalo De/Até + overrides (semana, % conclusão) → **Gerar e baixar .docx**. O download usa um helper novo `api.postBlob` ([api.ts](../apps/web/src/lib/api.ts)) que lê o binário + `Content-Disposition` e dispara o `<a download>` no browser (o cliente padrão sempre fazia `JSON.parse`, que estouraria num .docx).

**Dados do usuário** ([configuracoes/page.tsx](<../apps/web/src/app/(app)/configuracoes/page.tsx>), `PATCH /auth/me`): alterar nome/email/senha. Alterar email ou senha exige a **senha atual** (bcrypt.compare no service); o token é **reassinado** e o cookie reescrito, pois o JWT carrega name/email — sem isso a sessão mostraria dados velhos. O front faz `setQueryData(['me'])` no sucesso.

**Resumo** (`GET /summary`, [summary/](../apps/api/src/summary)): agregação numa leitura só (volume pessoal, cálculo em JS) — nº de projetos (ativos/total), conclusão média (progress das tasks ≠ FUTURO), total cobrado (Σ `CostPeriod.amount`), horas registradas, tasks, sessões, anotações + breakdown por projeto (com barra de progresso). Exibido em stat tiles na tela de Configurações.

**Sidebar:** entradas novas "Relatório" e "Configurações"; o bloco do usuário no rodapé virou link pra Configurações.

**Limpeza de lint (aproveitando):** tipados `jwt-auth.guard.ts` / `current-user.decorator.ts` (removido `any` do `req.user`/payload do JWT) e `void bootstrap()` no `main.ts` — eram erros de lint **pré-existentes** na API. O e2e ([app.e2e-spec.ts](../apps/api/test/app.e2e-spec.ts)) foi trocado do scaffold (`GET / → "Hello World"`, quebrado) para testar o `/health` real + 401 nas rotas novas (4 testes passando). *Nota:* o lint do **web** segue vermelho por uma regra do Next 16 (`react-hooks/set-state-in-effect`) que pega o padrão de sincronizar form no `useEffect(open)` — usado em ~11 telas pré-existentes; não refatorado aqui.

---

## Relatório — tela de revisão + histórico (21/08/2026)

**Contexto:** o relatório gerava "às cegas" (datas → .docx). Virou um fluxo de **revisão** (pré-relatório) editável antes de gerar, atendendo dois pedidos: escolher as tasks de "Próximas" e trazer a explicação das **sessões** para a justificativa.

*Candidatos* (`GET /projects/:id/reports/candidates?from&to`, [reports.service.ts](../apps/api/src/reports/reports.service.ts) `getCandidates`): devolve `realizadas`/`proximas` sugeridas (mesma derivação de antes, agora reutilizada em `deriveRealizadas`/`deriveProximas`), **todas as tasks** do projeto (para adicionar/preview) e as **sessões do intervalo** (painel lateral).

*Geração com linhas editadas:* `POST .../reports/generate` passou a aceitar `realizadas`/`proximas` (arrays de `ReportRowDto`) — se presentes, o backend usa direto (via `stripRow`); se ausentes, deriva (retrocompatível). A justificativa editada **não altera a task** (vive só no request/snapshot).

*Snapshot + histórico:* `Report.contextJson` (migration `20260821120000_relatorio_snapshot`) guarda o contexto renderizado. `generate` cria um `Report` com o JSON; `GET .../reports` lista o histórico; `GET .../reports/:id/download` **rebaixa** re-renderizando o snapshot (fiel mesmo se tasks/perfil mudarem depois). Não guarda arquivo em disco — regenera do JSON.

*UI de revisão* ([report-review.tsx](../apps/web/src/components/reports/report-review.tsx)): duas colunas — linhas editáveis (status/%, justificativa em textarea) + **painel lateral de sessões**. Cada sessão tem "Inserir" (anexa a nota na justificativa da linha em foco — controle por `focused {section,index}`) e "Copiar" (clipboard). Próximas têm **checkbox** incluir/excluir (auto + marcar/desmarcar), **Adicionar task** (select das restantes) e **+ linha manual** (também em Realizadas). Clicar no título da task abre um **modal** ([task-preview-dialog.tsx](../apps/web/src/components/reports/task-preview-dialog.tsx)) com descrição/notas/sessões, sem sair da tela. Download binário via `api.getBlob`/`postBlob` ([api.ts](../apps/web/src/lib/api.ts)).

*Cor por grupo (visual):* o `candidates` passou a trazer a cor do grupo de cada task (e das tasks nas sessões). Cada linha ganhou **faixa lateral de 4px** na cor do grupo + **chip do grupo** ao lado do título (mesmo padrão da aba de Tasks), **dot colorido no status** (Concluída lima / Em andamento âmbar / Em espera cinza) e **chips tingidos** no painel de sessões — mais legível sem poluir.

*Validado:* API tsc/lint limpos, e2e 4/4, rotas mapeadas + 401 sem auth, tela `/relatorio` compila. Pipeline Python inalterado (mesmas chaves de contexto).

---

## Sessões — seleção de tasks, pausa e planos/sprints (31/08/2026)

**Task 1 — seleção de tasks com filtro** ([task-select-list.tsx](../apps/web/src/components/tasks/task-select-list.tsx)): componente reutilizável de checkboxes com **busca por texto** e **concluídas escondidas por padrão** (toggle "Concluídas"; as já selecionadas seguem visíveis pra poder desmarcar) + dot da cor do grupo. Substituiu as listas que mostravam TODAS as tasks no **encerrar sessão** e no **planejar sessão**.

**Task 2 — pausar/continuar + plano reutilizável** (migration `20260831120000_sessao_pausa_e_sprint`, campos novos em `WorkSession`):
- *Pausa com desconto:* `accumulatedSeconds` (tempo ativo) + `runningSince` (início do segmento; null = pausada). Endpoints `POST /sessions/:id/pause` e `/resume`; `finish` fecha o segmento no acumulado. A **duração trabalhada passou a ser `accumulatedSeconds`** (exclui pausas) — atualizado em `sessionsToHours` ([calc.ts](../apps/web/src/lib/calc.ts)), no resumo ([summary.service.ts](../apps/api/src/summary/summary.service.ts)) e na agenda. **Backfill** na migration preserva a duração das sessões antigas (net = bruto) e mantém a ativa rodando. Status derivado ganhou `pausada`.
- *Plano/sprint como template:* sessão planejada (`startedAt` null) vira um **template reutilizável** com `name`. `POST /sessions/:id/start` deixou de consumi-la — agora **cria uma nova sessão trabalhada** (`parentId` = plano) herdando as **tasks + nota inicial**. O plano continua na lista até `POST /:id/complete-plan` (`plannedDoneAt`, sai das planejadas). `planned()` filtra `plannedDoneAt: null`.
- *Relação (mesma sprint):* auto-relação `parent`/`children` em `WorkSession`. No card, badge **"parte de: <plano>"**; na tela Sessões o **histórico é agrupado por sprint** ([sessoes/page.tsx](<../apps/web/src/app/(app)/sessoes/page.tsx>)). O badge do timer ([active-session-badge.tsx](../apps/web/src/components/sessions/active-session-badge.tsx)) ganhou **Pausar/Retomar** e estado "(pausada)".

*Regra mantida:* uma sessão aberta por vez — pausada ainda conta como aberta (`active()` inclui pausada), então não dá pra abrir outra sem retomar/encerrar. *Validado:* tsc/lint/e2e (4/4) limpos, rotas 401 sem auth, telas compilam.

**Ajustes de sessão (31/08, mesmo dia):**
- *Concluir plano no encerrar* ([finish-session-dialog.tsx](../apps/web/src/components/sessions/finish-session-dialog.tsx)): quando a sessão veio de um plano (`parent`), o modal de encerrar mostra um checkbox "Concluir o plano" — encerra a sessão e chama `complete-plan` no mesmo fluxo.
- *Filtro de sessões* ([sessoes/page.tsx](<../apps/web/src/app/(app)/sessoes/page.tsx>)): barra básica (Projeto + Status, à la Tasks) filtrando a lista antes de dividir em planos/histórico; mensagem de vazio ciente do filtro.
- *Filtro escondido por sprint:* clicar no card de um plano (corpo do card; botões usam `stopPropagation`) foca só as sessões daquele sprint no lugar do histórico completo (toggle; botão "Ver histórico completo" volta). `SessionCard` ganhou `selected`/`onSelect`.

---

## Carteira — finanças pessoais + integração com a Calculadora (10/09/2026)

Módulo pessoal (escopo por `userId`) de ganhos/gastos, com recorrentes, parcelas e integração manual com os recebimentos dos projetos. Plano: [PLANO-CARTEIRA.md](./PLANO-CARTEIRA.md).

*Modelo* (migration `20260910120000_carteira`): enums `TxType`/`TxOrigin`/`RecurrenceInterval`; `WalletCategory` (cor, reutilizável); `WalletTransaction` (unidade central — type/amount/date/paid, `origin`, e vínculos `projectId`/`costPeriodId @unique`/`recurringRuleId`/`installmentPlanId`); `RecurringRule` e `InstallmentPlan`. Uma carteira só (sem contas).

*Materialização* ([wallet.service.ts](../apps/api/src/wallet/wallet.service.ts)): parcelas geram as **N transações na criação** (divisão com ajuste de centavos na última); recorrentes são materializadas **sob demanda por mês** (`ensureRecurringForMonth`, idempotente por `recurringRuleId`+dia) ao listar/resumir — sem cron. Excluir recorrência tem opção "manter as já lançadas" (FK `onDelete: SetNull`); excluir parcelamento cascateia as parcelas.

*Resumo* (`GET /wallet/summary?month=YYYY-MM`): entradas/saídas, **saldo realizado × previsto** (pago vs incluindo pendentes), pendentes e **gastos por categoria** (para o gráfico de barras).

*Integração manual* (`POST /wallet/from-cost-period/:id`): botão na aba Calculadora lança um período "Pago" como ganho `INCOME` vinculado (`costPeriodId @unique` bloqueia duplicar; o histórico de períodos passou a incluir `walletTransaction` para mostrar "já lançado"). Ao lançar, invalida `['wallet']` e `['periods']`.

*Front* ([carteira/page.tsx](<../apps/web/src/app/(app)/carteira/page.tsx>)): seletor de mês, cards de resumo, barras de gasto por categoria e abas **Lançamentos / Recorrentes / Parcelas / Categorias**; diálogos em [components/wallet/](../apps/web/src/components/wallet). Entrada lima, saída rosa. Sidebar ganhou "Carteira".

*Testes:* [wallet.service.spec.ts](../apps/api/src/wallet/wallet.service.spec.ts) cobre a divisão de parcelas (Prisma mockado) e a agregação do resumo. *Validado:* tsc/lint/testes (API 5/5, web 32/32) limpos, 18 rotas mapeadas + 401 sem auth, `/carteira` compila.

---

## Deploy — cookie cross-site + guard client-side (30/07/2026)

**Local:** `apps/api/src/main.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/web/src/components/auth/auth-gate.tsx`, `apps/api/Dockerfile`, `apps/api/prisma/schema.prisma`, `docs/DEPLOY.md`

**Contexto:** deploy escolhido = Vercel (web) + Render (api) + Neon (Postgres) — três domínios diferentes, todos em tier grátis. Isso muda a mecânica de autenticação e exigiu ajustes.

**Soluções e conceitos:**
- *Cookie cross-site*: com web e api em domínios distintos, a request do browser para a api é cross-site. O browser só armazena/reenvia o cookie de sessão com `sameSite: 'none'` + `secure: true` (só sobre HTTPS). Opções agora são env-gated por `NODE_ENV` (`COOKIE_BASE` em `auth.controller.ts`); em dev continua `lax` + inseguro (http local). `clearCookie` usa as mesmas opções, senão o browser não casa e não apaga.
- *trust proxy*: atrás do proxy da Railway, o Express só reconhece a request como https (e envia o cookie `secure`) com `app.set('trust proxy', 1)`. Sem isso, login não persiste em produção. Exigiu tipar o app como `NestExpressApplication`.
- *Proteção de rota client-side (AuthGate)*: o middleware do Next foi **removido** — ele roda no domínio da web e nunca veria o cookie, que pertence ao domínio da api. O `AuthGate` consulta `GET /auth/me` (fonte de verdade): `mode="protected"` redireciona ao login se 401; `mode="guest"` manda pra home se já logado. Aplicado nos layouts `(app)` e `(auth)`.
- *Cache do `me` no login*: `useLogin`/`useRegister` fazem `setQueryData(['me'], user)` no sucesso — sem isso o AuthGate leria o 401 cacheado da tela de login e redirecionaria de volta (bug de cache do React Query).
- *Dockerfile multi-stage*: build a partir da **raiz** do monorepo (workspaces hoisted). Stage build faz `npm ci` + `prisma generate` + `nest build`; runner roda `prisma migrate deploy && node dist/main`. `openssl` instalado (Prisma engine exige em imagens slim).
- *Neon pooled + direct*: `schema.prisma` ganhou `directUrl`. Runtime usa a connection string pooled (`DATABASE_URL`), migrations usam a direct (`DIRECT_URL`) — Prisma exige conexão direta para DDL.

**Verificado local (dev, path lax):** rota protegida sem sessão → /login; login → home (persistiu); /login logado → home; logout → /login com cookie limpo.

**Passo-a-passo de plataformas:** ver `docs/DEPLOY.md`.

---

## Verificação E2E realizada (27/07/2026)

Fluxo completo no browser: registro → login (cookie) → criar projeto → criar task (status/prioridade/progresso) → sessão rápida em 2 cliques → captura rápida (append confirmado) → encerrar com task vinculada e próximo passo → criar sessão planejada com task → sessão planejada visível na Agenda (28/07) → item pessoal "Estudar NestJS e Node com APIs" na Agenda (29/07, badge "pessoal") → nota com markdown renderizando (heading/lista/negrito/código).

Segurança: `GET /projects` sem cookie → 401; senha errada → 401 (mesma mensagem); segundo usuário registrado enxerga `[]` em `/projects`.
