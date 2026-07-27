# DevLog — Especificação Técnica do MVP

> Documento de referência para implementação via Claude Code. Escopo reduzido ao mínimo necessário para validar o uso real do sistema no dia a dia. Tudo que está fora do escopo MVP está listado explicitamente em "Não-objetivos" — não implementar nada dessa lista sem confirmação.

---

## 1. Objetivo do MVP

Validar a hipótese central: registrar sessões de trabalho rapidamente permite recuperar contexto de qualquer projeto (trabalho, TCC, estudos) sem consultar múltiplas ferramentas, e permite gerar o relatório semanal da faculdade sem retrabalho manual, no formato exato exigido pela instituição.

O MVP entrega: **Projetos → Tasks (com Grupo e Progresso) → Sessões de Trabalho (planejadas ou não) → Notas → Relatório semanal gerado dentro do sistema.**

---

## 2. Stack

- **Backend:** NestJS + Prisma ORM + PostgreSQL
- **Frontend:** Next.js + React + TypeScript + Tailwind CSS + shadcn/ui
- **Geração de relatório:** script Python (`docxtpl`) invocado pelo backend via subprocesso, usando o `.docx` real da instituição como template — não recriado por código

Motivo do NestJS: estudo. Motivo do Python isolado: `docxtpl` resolve preservação de layout (logo, bordas, células mescladas) de um jeito que reconstrução manual via `python-docx` ou lib `docx` do Node não resolve com a mesma fidelidade — você edita o próprio Word com tags, o sistema só injeta dados.

---

## 3. Modelo de Dados (Prisma — rascunho)

```prisma
model Project {
  id            String    @id @default(cuid())
  name          String
  createdAt     DateTime  @default(now())
  archived      Boolean   @default(false)

  groups        Group[]
  tasks         Task[]
  sessions      WorkSession[]
  notes         Note[]
  reports       Report[]
  reportProfile ReportProfile?
}

// Metadados fixos usados no cabeçalho do relatório — preenchidos e editáveis a qualquer momento
// numa tela de configurações do projeto (ex: trocar coorientador no meio do semestre)
model ReportProfile {
  id            String   @id @default(cuid())
  projectId     String   @unique
  project       Project  @relation(fields: [projectId], references: [id])
  grupoTurma    String   // ex: "TDS-2026-013"
  aluno         String
  ra            String
  curso         String
  termo         String
  orientador    String
  coorientador  String?
  tema          String
  area          String
}

model Group {
  id        String   @id @default(cuid())
  name      String
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  tasks     Task[]
}

enum TaskStatus {
  BACKLOG
  EM_ANDAMENTO
  CONCLUIDO
  FUTURO       // "Feature ou Futuro" — substitui o antigo ARQUIVADO
}

enum TaskPriority {
  BAIXA
  MEDIA
  ALTA
}

model Task {
  id          String       @id @default(cuid())
  title       String
  description String?      // mantida atualizada = vira a Justificativa do relatório
  status      TaskStatus   @default(BACKLOG)
  priority    TaskPriority @default(MEDIA)
  progress    Int          @default(0) // 0-100
  notes       String?
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id])
  groupId     String?
  group       Group?       @relation(fields: [groupId], references: [id])
  sessions    WorkSession[] @relation("SessionTasks")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model WorkSession {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id])
  plannedFor  DateTime? // preenchido quando a sessão é planejada com antecedência
  startedAt   DateTime? // null = ainda é só planejamento, não começou
  endedAt     DateTime?
  notes       String?   // markdown livre (planejamento e/ou execução)
  commits     String?   // texto livre: uma linha por commit ("hash - descrição")
  nextStep    String?
  tasks       Task[]    @relation("SessionTasks")
}

model Note {
  id        String   @id @default(cuid())
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id])
  title     String
  content   String   // markdown
  createdAt DateTime @default(now())
}

// Snapshot imutável de uma entrega semanal — gerado uma vez, não recalculado depois
model Report {
  id           String        @id @default(cuid())
  projectId    String
  project      Project       @relation(fields: [projectId], references: [id])
  week         String        // ex: "20/2026"
  generatedAt  DateTime      @default(now())
  percentTotal Int           // "% Conclusão do Trabalho" — auto-calculado, editável antes de confirmar
  filePath     String?       // caminho do .docx gerado, para re-download
  items        ReportItem[]
}

enum ReportSection {
  REALIZADAS
  PROXIMAS
}

model ReportItem {
  id            String        @id @default(cuid())
  reportId      String
  report        Report        @relation(fields: [reportId], references: [id])
  section       ReportSection
  taskTitle     String
  status        String        // "Concluída" | "Em andamento" | "Em espera"
  percent       Int?          // null para itens de PROXIMAS
  justification String
}
```

**Status derivado da `WorkSession`** (não é campo no banco, é calculado):
```
startedAt == null                    → Planejada
startedAt != null && endedAt == null → Ativa
startedAt != null && endedAt != null → Concluída
```

---

## 4. Fluxo Principal — Sessão Rápida

Botão fixo "Nova Sessão" visível em qualquer tela, com duas opções:

**A) Início rápido (ad-hoc)**
1. Clique abre popover com seletor de projeto (pré-preenchido com o último usado).
2. Confirmar → `startedAt = now()`, popover fecha, badge de timer aparece fixo na tela.

**B) Sessão planejada**
1. Clique mostra lista de sessões com `startedAt == null` (criadas no seu planejamento semanal), ordenadas por `plannedFor`.
2. Selecionar uma → `startedAt = now()`, tasks e notas já vêm pré-preenchidas do planejamento.

Total: 2 cliques em ambos os casos.

**Durante a sessão:** clicar no badge do timer abre uma textarea de captura rápida (vai direto para `notes`/`commits` da sessão ativa, concatenando).

**Encerrar sessão:** formulário curto (tasks trabalhadas, notas, commits, próximo passo) — nenhum campo obrigatório, salva em branco se preciso.

**Planejamento semanal:** tela separada onde você cria várias `WorkSession` com `plannedFor` definido e `startedAt` nulo, associando projeto + tasks esperadas + uma nota do que pretende fazer. Essas alimentam a lista do botão "Sessão planejada".

---

## 5. Relatório Semanal

**Fluxo dentro do sistema:**

1. Tela "Gerar Relatório": selecionar projeto + semana (dropdown de datas, com valor padrão sugerido a partir da data atual — sempre editável, já que a numeração pode não bater exatamente com o calendário ou você pode gerar atrasado).
2. Sistema busca candidatos para `realizadas`: tasks com pelo menos uma `WorkSession` cujo `startedAt` cai dentro da semana selecionada.
3. Sistema busca candidatos para `proximas`: tasks associadas a `WorkSession` planejadas (`startedAt == null`) com `plannedFor` na semana seguinte — vem direto do seu planejamento semanal, sem digitar de novo.
4. Pré-preenche uma tela de revisão com, por task: título, status derivado, `progress` (quando aplicável), e `description`/nota da sessão planejada como justificativa sugerida — **editável antes de confirmar**, já que a justificativa é texto narrativo, não um dump automático.
5. `% Conclusão do Trabalho` sugerido = média de `progress` das tasks com status diferente de `FUTURO` — também editável.
6. Ao confirmar: grava `Report` + `ReportItem[]` (snapshot imutável, com uma flag indicando se o item pertence a `realizadas` ou `proximas`) e dispara a geração do `.docx`.

**Regra de status na linha da tabela** (não altera o `status` real salvo na task):
```
progress == 100  → "Concluída"
progress != 100  → "Em andamento"
```

**Geração do `.docx` via `docxtpl` — já implementado e testado.**

O template real da instituição (`RAP-TDS-2026_013.docx`) foi tagueado e validado (schema OOXML + renderização com `docxtpl` + inspeção visual via LibreOffice). Arquivo final: `RAP-TDS-2026_013-template-docxtpl.docx` — usar como está, não precisa remarcar.

**Contexto esperado pelo template** (chaves exatas que o script Python deve montar e passar pro `doc.render(context)`):

```python
context = {
    "grupo_turma": "TDS-2026-013",
    "aluno": "Guilherme Carrion Caldeira Ribeiro",
    "ra": "219693",
    "curso": "Tecnologia em Desenvolvimento de Sistemas",
    "termo": "5º",
    "semana": "20/2026",
    "data": "20/07/2026",
    "percent_total": 32,              # int, sem o símbolo %
    "orientador": "Prof. Hericson Dos Santos",
    "coorientador": "Prof. Francisco Antonio De Sousa",
    "tema": "Sistema de Gestão e automações para Academias",
    "area": "Sistema de Gestão e Serviços",
    "realizadas": [                    # tasks com sessão na semana selecionada
        {"tarefa": "...", "status": "Concluída", "percent": 100, "justificativa": "..."},
        {"tarefa": "...", "status": "Em andamento", "percent": 40, "justificativa": "..."},
    ],
    "proximas": [                      # candidatos: sessões planejadas para a próxima semana
        {"tarefa": "...", "status": "Em espera", "justificativa": "..."},
    ],
}
```

Detalhe de implementação relevante: as linhas repetíveis da tabela usam a sintaxe de loop de linha do `docxtpl` (`{%tr for %}` / `{%tr endfor %}`) em **linhas próprias, separadas da linha de conteúdo** — colocar o `for`/`endfor` na mesma linha do conteúdo quebra o parser do docxtpl (regex ganancioso engole a tag `for`). Não mexer nessa estrutura ao editar o template.

`grupo_turma`, `aluno`, `ra`, `curso`, `termo`, `orientador`, `coorientador`, `tema`, `area` vêm do `ReportProfile` do projeto (preenchido uma vez). `semana`, `data`, `percent_total`, `realizadas`, `proximas` são montados por request, a partir do `Report`/`ReportItem` recém-confirmados. `proximas` mapeia diretamente das `WorkSession` planejadas (`startedAt == null`) para a semana seguinte — reaproveita o dado que você já registra no planejamento semanal, sem digitar de novo.

**Fluxo de geração:**
1. NestJS, ao confirmar o relatório, monta o JSON de contexto acima e roda `python gerar_relatorio.py --template RAP-TDS-2026_013-template-docxtpl.docx --input tmp.json --output saida.docx` via subprocesso.
2. Script carrega o template com `docxtpl`, renderiza o contexto, salva o `.docx`.
3. NestJS lê o arquivo gerado, salva o caminho em `Report.filePath`, e o disponibiliza para download.

---

## 6. Telas mínimas do MVP

- Lista de Projetos + criar projeto (+ preencher `ReportProfile` para projetos acadêmicos)
- Página de Projeto: abas Tasks / Sessões / Notas / Relatórios
- Lista de Tasks (filtro por grupo e status) + criar/editar task
- Planejamento semanal: criar sessões planejadas
- Lista de Sessões (histórico) + editar sessão encerrada
- Lista de Notas + editor markdown simples
- Gerar Relatório: seleção de projeto/semana → tela de revisão → confirmar → download
- Histórico de Relatórios gerados (snapshots já confirmados)
- Botão global "Nova Sessão" (início rápido / planejada) + badge de timer ativo

Sem dashboard, sem gráfico, sem heatmap nesta fase.

---

## 7. Não-objetivos do MVP

- Heatmap
- Timeline visual
- Integração real com Git/GitHub (leitura de commits via API)
- Dashboard com métricas agregadas
- Diagramas / integração com Excalidraw
- Exportação em PDF (só `.docx` por ora)
- Timer Pomodoro, calendário, IA para resumir sessões

---

## 8. Ordem sugerida de implementação

1. Setup do monorepo (NestJS + Next.js) e schema Prisma inicial
2. CRUD de Project, ReportProfile e Group
3. CRUD de Task (status, progress, priority)
4. WorkSession: início rápido, encerramento, associação com tasks
5. Planejamento semanal: criar sessões com `startedAt` nulo + fluxo de "iniciar sessão planejada"
6. Captura rápida durante sessão ativa
7. Note (CRUD simples + render markdown)
8. Modelo Report/ReportItem + endpoint que monta candidatos por semana
9. Tela de revisão do relatório (edição antes de confirmar)
10. Integração com `docxtpl`: template tagueado + script Python + subprocess a partir do NestJS
11. Polimento do fluxo de sessão rápida
