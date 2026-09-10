# Plano — Módulo "Minha Carteira" (finanças pessoais)

> Documento de planejamento. **Implementado em 10/09/2026** (ver `docs/SOLUCOES.md` → "Carteira"). Escopo definido com o usuário em 31/08/2026.

## 1. Objetivo

Controle financeiro pessoal do usuário: registrar **ganhos** e **gastos**, incluindo **pagamentos recorrentes** (assinaturas, aluguel) e **compras parceladas**, com **integração manual** aos recebimentos dos projetos (Calculadora). Visão mensal com saldo e resumo por categoria.

## 2. Decisões travadas

| Decisão | Escolha |
|---|---|
| Integração com a Calculadora | **Manual** — botão no período "Pago" (`CostPeriod`) lança o valor como ganho na Carteira, vinculado |
| Recorrências e parcelas | **Materializar** as ocorrências no banco (transações reais, editáveis, marcáveis como pagas) |
| Contas/carteiras | **Uma só** (saldo global); múltiplas contas ficam para depois |
| Escopo do MVP | **Tudo de uma vez**: lançamentos + recorrência + parcela + integração |
| Escopo de dados | Por **usuário** (`userId`), não por projeto |

## 3. Modelo de dados (Prisma — proposta)

```prisma
enum TxType { INCOME EXPENSE }
enum TxOrigin { MANUAL RECURRING INSTALLMENT PROJECT }
enum RecurrenceInterval { MONTHLY WEEKLY YEARLY }

// Categoria com cor, reutilizável (padrão de Tag/PeriodCategory)
model WalletCategory {
  id     String  @id @default(cuid())
  userId String
  user   User    @relation(fields: [userId], references: [id])
  name   String
  color  String
  transactions   WalletTransaction[]
  recurringRules RecurringRule[]
  installments   InstallmentPlan[]
  @@unique([userId, name])
}

// Lançamento — unidade central
model WalletTransaction {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        TxType
  amount      Float
  date        DateTime            // competência / vencimento
  paid        Boolean  @default(false)
  paidAt      DateTime?
  description String
  categoryId  String?
  category    WalletCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  origin      TxOrigin @default(MANUAL)

  // Vínculos de origem
  projectId         String?  // integração: ganho de um projeto
  costPeriodId      String?  @unique // o período que originou (evita duplicar)
  recurringRuleId   String?
  recurringRule     RecurringRule?   @relation(fields: [recurringRuleId], references: [id], onDelete: SetNull)
  installmentPlanId String?
  installmentPlan   InstallmentPlan? @relation(fields: [installmentPlanId], references: [id], onDelete: Cascade)
  installmentNumber Int?     // parcela X de N

  createdAt DateTime @default(now())
}

// Regra de recorrência (assinaturas, aluguel) — materializa transações
model RecurringRule {
  id          String             @id @default(cuid())
  userId      String
  user        User               @relation(fields: [userId], references: [id])
  type        TxType
  amount      Float
  description String
  categoryId  String?
  category    WalletCategory?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  interval    RecurrenceInterval @default(MONTHLY)
  dayOfMonth  Int?               // ex: todo dia 5 (para MONTHLY)
  startDate   DateTime
  endDate     DateTime?
  active      Boolean            @default(true)
  lastGeneratedFor DateTime?     // até quando já materializou (evita duplicar)
  transactions WalletTransaction[]
}

// Compra parcelada — gera N transações mensais na criação
model InstallmentPlan {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  type              TxType   @default(EXPENSE)
  description       String
  categoryId        String?
  category          WalletCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  totalAmount       Float
  installmentsCount Int
  firstDueDate      DateTime
  createdAt         DateTime @default(now())
  transactions      WalletTransaction[]
}
```

`User` ganha as relações inversas: `walletCategories`, `walletTransactions`, `recurringRules`, `installmentPlans`.

## 4. Materialização (regra de geração)

- **Parcelas:** ao criar um `InstallmentPlan`, gera as **N** `WalletTransaction` de uma vez — `dueDate` mensal a partir de `firstDueDate`, `amount = round(total / N)` com **ajuste de centavos na última parcela** (soma exata), `installmentNumber` 1..N, `origin = INSTALLMENT`.
- **Recorrências:** materialização **sob demanda** (não há cron no MVP). Ao consultar um mês, o backend garante que as ocorrências das regras ativas para aquele mês existam — idempotente por (`recurringRuleId` + competência do mês). `lastGeneratedFor` evita retrabalho. Editar/excluir uma ocorrência específica não afeta a regra.
- **Excluir uma regra/plano:** as transações já materializadas podem ser mantidas ou removidas (decisão de UI — provável: perguntar "manter as já lançadas?").

## 5. Integração com a Calculadora (manual)

- Na aba **Calculadora** do projeto, no histórico de períodos (`CostPeriod` "Pago"), botão **"Lançar na Carteira"** → cria `WalletTransaction` `INCOME` com `projectId` + `costPeriodId`, `amount = period.amount`, `date = period.endDate`, `origin = PROJECT`, categoria default "Projetos".
- **Anti-duplicação:** `costPeriodId @unique` — se já lançado, o botão vira "Já na Carteira" (desabilitado) e some/ajusta ao reabrir o período.
- Sem espelho automático nem projeção (decisão: manual).

## 6. Backend (NestJS — módulo `wallet`)

- **Categorias:** `GET/POST/PATCH/DELETE /wallet/categories`
- **Transações:** `GET /wallet/transactions?month=YYYY-MM&type=&categoryId=&paid=` · `POST` · `PATCH /:id` · `DELETE /:id` · `POST /:id/toggle-paid`
- **Recorrentes:** `GET/POST/PATCH/DELETE /wallet/recurring` (POST/consulta dispara a materialização do mês)
- **Parcelas:** `GET /wallet/installments` · `POST` (gera as N) · `DELETE /:id`
- **Resumo:** `GET /wallet/summary?month=YYYY-MM` → entradas, saídas, saldo (realizado × previsto), por categoria, pendentes, próximos vencimentos
- **Integração:** `POST /wallet/from-cost-period/:costPeriodId` (lança um período do projeto como ganho)
- Tudo escopado por `userId`; recursos por projeto conferem ownership via `project.userId` (padrão do sistema).

## 7. Frontend

- **Sidebar:** item "Carteira" (ícone `Wallet`).
- **Tela Carteira:**
  - Cabeçalho: **seletor de mês**, **saldo do mês** (realizado e previsto), cards de resumo (entradas, saídas, pendentes).
  - Seções/abas: **Lançamentos** (lista do mês, filtros tipo/categoria/pago, criar/editar), **Recorrentes** (regras), **Parcelas** (planos), **Categorias** (criar com cor, à la grupos).
  - **Dialog de lançamento:** tipo (income/expense), valor, data, categoria, pago; opção de virar **recorrência** ou **parcelamento**.
  - **Gráfico por categoria** (barras/rosca) — seguir o skill `dataviz` na implementação.
- **Integração:** botão "Lançar na Carteira" no card de período da Calculadora.
- **Cores por informação:** income lima/verde, expense rosa/vermelho, pendente âmbar — consistente com o resto do sistema.

## 8. Ordem de implementação (mesmo entregando tudo)

1. Schema + migration (aditiva; fluxo `migrate diff` + apply, Docker-independente)
2. Backend `wallet`: categorias + transações + resumo
3. Frontend: tela + lançamentos + categorias + resumo mensal
4. Recorrentes + parcelas (backend geração + UI)
5. Integração botão na Calculadora (`from-cost-period`)
6. Gráfico/dashboard do mês

## 9. Pontos em aberto (resolver na implementação)

- **Saldo realizado × previsto:** mostrar os dois (pago vs incluindo pendentes do mês)? Provável que sim.
- **Excluir regra/plano:** manter as ocorrências já lançadas ou apagar junto? (perguntar na UI)
- **Categorias por tipo** (income/expense) ou genéricas? Proposta: genéricas (nome+cor), o tipo vem da transação.
- **Fuso/competência:** mês por data local; alinhar com o padrão da Agenda.
- **Recorrência semanal/anual:** modeladas no enum, mas o MVP pode focar em MENSAL e habilitar as outras depois.
