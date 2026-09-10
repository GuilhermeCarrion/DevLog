import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RecurrenceInterval, TxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInstallmentDto,
  CreateRecurringDto,
  CreateTransactionDto,
  TransactionsQueryDto,
  UpdateInstallmentDto,
  UpdateRecurringDto,
  UpdateTransactionDto,
  UpsertWalletCategoryDto,
  UpdateWalletCategoryDto,
} from './dto/wallet.dto';

// ---------- helpers de data (fuso local, como o resto do app) ----------
function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0, 0),
    end: new Date(y, m, 1, 0, 0, 0, 0), // exclusivo
  };
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function addMonths(d: Date, n: number) {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  t.setDate(Math.min(d.getDate(), daysInMonth(t.getFullYear(), t.getMonth())));
  return t;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
// "YYYY-MM-DD" → meia-noite LOCAL. `new Date("YYYY-MM-DD")` parseia como UTC e
// desloca o dia em fusos negativos (o que quebrava a dedup das recorrências).
function parseDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}
// Uma data que já passou (anterior a hoje) nasce PAGA e imutável — histórico fiel.
function isPastDay(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Categorias ====================

  listCategories(userId: string) {
    return this.prisma.walletCategory.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  createCategory(userId: string, dto: UpsertWalletCategoryDto) {
    return this.prisma.walletCategory.create({
      data: { userId, name: dto.name, color: dto.color },
    });
  }

  async updateCategory(
    userId: string,
    id: string,
    dto: UpdateWalletCategoryDto,
  ) {
    await this.assertCategory(userId, id);
    return this.prisma.walletCategory.update({
      where: { id },
      data: { name: dto.name, color: dto.color },
    });
  }

  async removeCategory(userId: string, id: string) {
    await this.assertCategory(userId, id);
    // categoryId dos lançamentos vira null (onDelete: SetNull)
    return this.prisma.walletCategory.delete({ where: { id } });
  }

  // ==================== Transações ====================

  async listTransactions(userId: string, q: TransactionsQueryDto) {
    if (q.month) await this.ensureRecurringForMonth(userId, q.month);
    const where: Prisma.WalletTransactionWhereInput = { userId };
    if (q.month) {
      const { start, end } = monthRange(q.month);
      where.date = { gte: start, lt: end };
    }
    if (q.type) where.type = q.type;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.paid) where.paid = q.paid === 'true';
    return this.prisma.walletTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { category: true },
    });
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    return this.prisma.walletTransaction.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        date: parseDate(dto.date),
        description: dto.description,
        categoryId: dto.categoryId ?? null,
        paid: dto.paid ?? false,
        paidAt: dto.paid ? new Date() : null,
      },
      include: { category: true },
    });
  }

  async updateTransaction(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ) {
    const tx = await this.assertTransaction(userId, id);
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    const paid = dto.paid ?? tx.paid;
    return this.prisma.walletTransaction.update({
      where: { id },
      data: {
        type: dto.type,
        amount: dto.amount,
        date: dto.date ? parseDate(dto.date) : undefined,
        description: dto.description,
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        paid: dto.paid,
        paidAt: dto.paid === undefined ? undefined : paid ? new Date() : null,
      },
      include: { category: true },
    });
  }

  async togglePaid(userId: string, id: string) {
    const tx = await this.assertTransaction(userId, id);
    const paid = !tx.paid;
    return this.prisma.walletTransaction.update({
      where: { id },
      data: { paid, paidAt: paid ? new Date() : null },
      include: { category: true },
    });
  }

  async removeTransaction(userId: string, id: string) {
    await this.assertTransaction(userId, id);
    return this.prisma.walletTransaction.delete({ where: { id } });
  }

  // ==================== Recorrentes ====================

  listRecurring(userId: string) {
    return this.prisma.recurringRule.findMany({
      where: { userId },
      orderBy: { description: 'asc' },
      include: { category: true },
    });
  }

  async createRecurring(userId: string, dto: CreateRecurringDto) {
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    const rule = await this.prisma.recurringRule.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        categoryId: dto.categoryId ?? null,
        interval: dto.interval ?? RecurrenceInterval.MONTHLY,
        dayOfMonth: dto.dayOfMonth ?? null,
        startDate: parseDate(dto.startDate),
        endDate: dto.endDate ? parseDate(dto.endDate) : null,
      },
    });
    // materializa o mês corrente já de cara
    const now = new Date();
    await this.ensureRecurringForMonth(
      userId,
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    );
    return rule;
  }

  async updateRecurring(userId: string, id: string, dto: UpdateRecurringDto) {
    await this.assertRule(userId, id);
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    const rule = await this.prisma.recurringRule.update({
      where: { id },
      data: {
        amount: dto.amount,
        description: dto.description,
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        dayOfMonth: dto.dayOfMonth,
        endDate:
          dto.endDate === undefined
            ? undefined
            : dto.endDate
              ? parseDate(dto.endDate)
              : null,
        active: dto.active,
      },
    });
    // Propaga valor/descrição/categoria para os lançamentos PENDENTES (os pagos
    // ficam como histórico fiel do que aconteceu).
    await this.prisma.walletTransaction.updateMany({
      where: { recurringRuleId: id, paid: false },
      data: {
        amount: rule.amount,
        description: rule.description,
        categoryId: rule.categoryId,
      },
    });
    return rule;
  }

  // keepGenerated=true: mantém as transações já lançadas (só solta o vínculo)
  async removeRecurring(userId: string, id: string, keepGenerated: boolean) {
    await this.assertRule(userId, id);
    if (!keepGenerated) {
      await this.prisma.walletTransaction.deleteMany({
        where: { recurringRuleId: id },
      });
    }
    // com keepGenerated, o onDelete: SetNull do FK preserva as transações
    return this.prisma.recurringRule.delete({ where: { id } });
  }

  // Materializa as ocorrências das regras ativas para um mês (idempotente).
  private async ensureRecurringForMonth(userId: string, month: string) {
    const { start, end } = monthRange(month);
    const rules = await this.prisma.recurringRule.findMany({
      where: {
        userId,
        active: true,
        startDate: { lt: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
    });
    for (const rule of rules) {
      const occ = this.occurrencesInMonth(rule, start, end);
      if (!occ.length) continue;

      let toCreate: Date[];
      if (rule.interval === 'WEEKLY') {
        // semanal: várias por mês → dedup por dia
        const existing = await this.prisma.walletTransaction.findMany({
          where: { recurringRuleId: rule.id, date: { gte: start, lt: end } },
          select: { date: true },
        });
        const have = new Set(existing.map((e) => dayKey(e.date)));
        toCreate = occ.filter((o) => !have.has(dayKey(o)));
      } else {
        // mensal/anual: NO MÁXIMO uma por mês. Se já houver qualquer lançamento
        // desta regra no mês (mesmo com o dia movido pelo usuário), não recria.
        const count = await this.prisma.walletTransaction.count({
          where: { recurringRuleId: rule.id, date: { gte: start, lt: end } },
        });
        toCreate = count > 0 ? [] : occ;
      }

      if (toCreate.length) {
        await this.prisma.walletTransaction.createMany({
          data: toCreate.map((date) => {
            const past = isPastDay(date); // passado nasce pago (imutável)
            return {
              userId,
              type: rule.type,
              amount: rule.amount,
              date,
              description: rule.description,
              categoryId: rule.categoryId,
              origin: 'RECURRING' as const,
              recurringRuleId: rule.id,
              paid: past,
              paidAt: past ? date : null,
            };
          }),
        });
      }
    }
  }

  // Datas de ocorrência de uma regra dentro de um mês [start, end)
  private occurrencesInMonth(
    rule: {
      interval: RecurrenceInterval;
      dayOfMonth: number | null;
      startDate: Date;
      endDate: Date | null;
    },
    start: Date,
    end: Date,
  ): Date[] {
    const occ: Date[] = [];
    const y = start.getFullYear();
    const m = start.getMonth();
    if (rule.interval === 'MONTHLY') {
      const day = Math.min(
        rule.dayOfMonth ?? rule.startDate.getDate(),
        daysInMonth(y, m),
      );
      occ.push(new Date(y, m, day));
    } else if (rule.interval === 'YEARLY') {
      if (rule.startDate.getMonth() === m) {
        const day = Math.min(rule.startDate.getDate(), daysInMonth(y, m));
        occ.push(new Date(y, m, day));
      }
    } else {
      // WEEKLY: a partir do startDate, passos de 7 dias dentro do mês
      let d = new Date(rule.startDate);
      d.setHours(0, 0, 0, 0);
      while (d < start)
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      while (d < end) {
        occ.push(new Date(d));
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      }
    }
    const startFloor = new Date(rule.startDate);
    startFloor.setHours(0, 0, 0, 0);
    return occ.filter(
      (o) => o >= startFloor && (!rule.endDate || o <= rule.endDate),
    );
  }

  // ==================== Parcelas ====================

  listInstallments(userId: string) {
    return this.prisma.installmentPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        transactions: {
          select: { id: true, paid: true, amount: true, date: true },
          orderBy: { date: 'asc' },
        },
      },
    });
  }

  async createInstallment(userId: string, dto: CreateInstallmentDto) {
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    const type = dto.type ?? TxType.EXPENSE;
    const first = parseDate(dto.firstDueDate);
    const n = dto.installmentsCount;
    const per = round2(dto.totalAmount / n);

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.installmentPlan.create({
        data: {
          userId,
          type,
          description: dto.description,
          categoryId: dto.categoryId ?? null,
          totalAmount: dto.totalAmount,
          installmentsCount: n,
          firstDueDate: first,
        },
      });
      await tx.walletTransaction.createMany({
        data: Array.from({ length: n }, (_, i) => {
          const date = addMonths(first, i);
          const past = isPastDay(date); // parcela vencida já nasce paga
          return {
            userId,
            type,
            // ajuste de centavos na última parcela para somar o total exato
            amount: i === n - 1 ? round2(dto.totalAmount - per * (n - 1)) : per,
            date,
            description: `${dto.description} (${i + 1}/${n})`,
            categoryId: dto.categoryId ?? null,
            origin: 'INSTALLMENT' as const,
            installmentPlanId: plan.id,
            installmentNumber: i + 1,
            paid: past,
            paidAt: past ? date : null,
          };
        }),
      });
      return tx.installmentPlan.findUnique({
        where: { id: plan.id },
        include: { category: true, transactions: true },
      });
    });
  }

  // Edita descrição/categoria do parcelamento (total/nº de parcelas são fixos).
  // Propaga para as parcelas PENDENTES; as pagas ficam como histórico.
  async updateInstallment(
    userId: string,
    id: string,
    dto: UpdateInstallmentDto,
  ) {
    await this.assertPlan(userId, id);
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    const plan = await this.prisma.installmentPlan.update({
      where: { id },
      data: {
        description: dto.description,
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
      },
    });
    const pending = await this.prisma.walletTransaction.findMany({
      where: { installmentPlanId: id, paid: false },
      select: { id: true, installmentNumber: true },
    });
    await Promise.all(
      pending.map((t) =>
        this.prisma.walletTransaction.update({
          where: { id: t.id },
          data: {
            description: `${plan.description} (${t.installmentNumber}/${plan.installmentsCount})`,
            categoryId: plan.categoryId,
          },
        }),
      ),
    );
    return plan;
  }

  async removeInstallment(userId: string, id: string) {
    await this.assertPlan(userId, id);
    // onDelete: Cascade nas transações remove as parcelas junto
    return this.prisma.installmentPlan.delete({ where: { id } });
  }

  // ==================== Resumo ====================

  async summary(userId: string, month: string) {
    await this.ensureRecurringForMonth(userId, month);
    const { start, end } = monthRange(month);
    const txs = await this.prisma.walletTransaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true },
    });

    let income = 0;
    let expense = 0;
    let incomePaid = 0;
    let expensePaid = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;
    const byCat = new Map<
      string,
      { name: string; color: string; total: number }
    >();

    for (const t of txs) {
      if (t.type === 'INCOME') {
        income += t.amount;
        if (t.paid) incomePaid += t.amount;
        else pendingIncome += t.amount;
      } else {
        expense += t.amount;
        if (t.paid) expensePaid += t.amount;
        else pendingExpense += t.amount;
        // gráfico de gastos por categoria
        const key = t.categoryId ?? '__none__';
        const cur = byCat.get(key) ?? {
          name: t.category?.name ?? 'Sem categoria',
          color: t.category?.color ?? '#9aa0aa',
          total: 0,
        };
        cur.total += t.amount;
        byCat.set(key, cur);
      }
    }

    const pendingCount = txs.filter((t) => !t.paid).length;

    // Saldo TOTAL guardado (all-time, só pagos) — valor do cartão
    const paidAgg = await this.prisma.walletTransaction.groupBy({
      by: ['type'],
      where: { userId, paid: true },
      _sum: { amount: true },
    });
    const paidIncome =
      paidAgg.find((p) => p.type === 'INCOME')?._sum.amount ?? 0;
    const paidExpense =
      paidAgg.find((p) => p.type === 'EXPENSE')?._sum.amount ?? 0;

    return {
      month,
      totalBalance: round2(paidIncome - paidExpense),
      income: round2(income),
      expense: round2(expense),
      incomePaid: round2(incomePaid),
      expensePaid: round2(expensePaid),
      saldoPrevisto: round2(income - expense),
      saldoRealizado: round2(incomePaid - expensePaid),
      pending: {
        count: pendingCount,
        income: round2(pendingIncome),
        expense: round2(pendingExpense),
      },
      expenseByCategory: [...byCat.values()]
        .map((c) => ({ ...c, total: round2(c.total) }))
        .sort((a, b) => b.total - a.total),
      count: txs.length,
    };
  }

  // ==================== Integração com a Calculadora ====================

  async fromCostPeriod(userId: string, costPeriodId: string) {
    const period = await this.prisma.costPeriod.findFirst({
      where: { id: costPeriodId, project: { userId } },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!period) throw new NotFoundException('Período não encontrado');

    const existing = await this.prisma.walletTransaction.findUnique({
      where: { costPeriodId },
    });
    if (existing) {
      throw new ConflictException('Este período já foi lançado na Carteira.');
    }

    return this.prisma.walletTransaction.create({
      data: {
        userId,
        type: TxType.INCOME,
        amount: period.amount,
        date: period.endDate,
        paid: true,
        paidAt: period.endDate,
        description: `Projeto ${period.project.name}${period.label ? ` — ${period.label}` : ''}`,
        origin: 'PROJECT',
        projectId: period.project.id,
        costPeriodId: period.id,
      },
      include: { category: true },
    });
  }

  // ==================== ownership ====================

  private async assertCategory(userId: string, id: string) {
    const c = await this.prisma.walletCategory.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Categoria não encontrada');
  }

  private async assertTransaction(userId: string, id: string) {
    const t = await this.prisma.walletTransaction.findFirst({
      where: { id, userId },
    });
    if (!t) throw new NotFoundException('Lançamento não encontrado');
    return t;
  }

  private async assertRule(userId: string, id: string) {
    const r = await this.prisma.recurringRule.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!r) throw new NotFoundException('Recorrência não encontrada');
  }

  private async assertPlan(userId: string, id: string) {
    const p = await this.prisma.installmentPlan.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Parcelamento não encontrado');
  }
}
