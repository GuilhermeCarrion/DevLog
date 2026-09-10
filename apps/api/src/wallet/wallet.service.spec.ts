import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  describe('summary', () => {
    const txs = [
      {
        type: 'INCOME',
        amount: 1000,
        paid: true,
        categoryId: null,
        category: null,
      },
      {
        type: 'EXPENSE',
        amount: 200,
        paid: true,
        categoryId: 'c1',
        category: { name: 'Aluguel', color: '#f00' },
      },
      {
        type: 'EXPENSE',
        amount: 50,
        paid: false,
        categoryId: 'c2',
        category: { name: 'Comida', color: '#0f0' },
      },
    ];

    it('agrega entradas/saídas, previsto × realizado e gastos por categoria', async () => {
      const prisma = {
        recurringRule: { findMany: jest.fn().mockResolvedValue([]) },
        walletTransaction: {
          findMany: jest.fn().mockResolvedValue(txs),
          createMany: jest.fn(),
          // saldo total guardado (all-time, pagos): 1000 - 200 = 800
          groupBy: jest.fn().mockResolvedValue([
            { type: 'INCOME', _sum: { amount: 1000 } },
            { type: 'EXPENSE', _sum: { amount: 200 } },
          ]),
        },
      } as unknown as PrismaService;
      const service = new WalletService(prisma);

      const r = await service.summary('u1', '2026-09');

      expect(r.totalBalance).toBe(800);
      expect(r.income).toBe(1000);
      expect(r.expense).toBe(250);
      expect(r.incomePaid).toBe(1000);
      expect(r.expensePaid).toBe(200);
      expect(r.saldoPrevisto).toBe(750);
      expect(r.saldoRealizado).toBe(800);
      expect(r.pending).toEqual({ count: 1, income: 0, expense: 50 });
      expect(r.expenseByCategory).toEqual([
        { name: 'Aluguel', color: '#f00', total: 200 },
        { name: 'Comida', color: '#0f0', total: 50 },
      ]);
    });
  });

  describe('recorrência mensal (dedup)', () => {
    const rule = {
      id: 'r1',
      interval: 'MONTHLY',
      dayOfMonth: 10,
      startDate: new Date(2026, 8, 10),
      endDate: null,
      type: 'EXPENSE',
      amount: 160,
      description: 'Academia',
      categoryId: null,
    };

    function makeService(existingCount: number) {
      const created: unknown[] = [];
      const createMany = jest
        .fn()
        .mockImplementation(({ data }: { data: unknown[] }) => {
          created.push(...data);
        });
      const prisma = {
        recurringRule: { findMany: jest.fn().mockResolvedValue([rule]) },
        walletTransaction: {
          count: jest.fn().mockResolvedValue(existingCount),
          findMany: jest.fn().mockResolvedValue([]),
          createMany,
        },
      } as unknown as PrismaService;
      return { service: new WalletService(prisma), createMany, created };
    }

    it('NÃO recria se já existe um lançamento da regra no mês', async () => {
      const { service, createMany } = makeService(1);
      await service.listTransactions('u1', { month: '2026-09' });
      expect(createMany).not.toHaveBeenCalled();
    });

    it('materializa exatamente uma ocorrência quando não existe', async () => {
      const { service, created } = makeService(0);
      await service.listTransactions('u1', { month: '2026-09' });
      expect(created).toHaveLength(1);
    });
  });

  describe('createInstallment', () => {
    it('divide em N parcelas com ajuste de centavos na última', async () => {
      const created: { amount: number }[] = [];
      const inner = {
        installmentPlan: {
          create: jest.fn().mockResolvedValue({ id: 'plan1' }),
          findUnique: jest.fn().mockResolvedValue({ id: 'plan1' }),
        },
        walletTransaction: {
          createMany: jest
            .fn()
            .mockImplementation(({ data }: { data: { amount: number }[] }) => {
              created.push(...data);
            }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation((cb: (tx: unknown) => unknown) => cb(inner)),
      } as unknown as PrismaService;
      const service = new WalletService(prisma);

      await service.createInstallment('u1', {
        description: 'TV',
        totalAmount: 100,
        installmentsCount: 3,
        firstDueDate: '2026-09-10',
      });

      const amounts = created.map((t) => t.amount);
      expect(amounts).toEqual([33.33, 33.33, 33.34]);
      expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    });
  });
});
