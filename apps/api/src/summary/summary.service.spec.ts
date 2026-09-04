import { PrismaService } from '../prisma/prisma.service';
import { SummaryService } from './summary.service';

// Unit test: agregação pura do resumo, com o Prisma mockado (sem banco).
describe('SummaryService.getSummary', () => {
  function makeService(projects: unknown[], notesCount: number) {
    const prisma = {
      project: { findMany: jest.fn().mockResolvedValue(projects) },
      note: { count: jest.fn().mockResolvedValue(notesCount) },
    } as unknown as PrismaService;
    return new SummaryService(prisma);
  }

  const projects = [
    {
      id: 'p1',
      name: 'A',
      archived: false,
      tasks: [
        { progress: 100, status: 'CONCLUIDO' },
        { progress: 50, status: 'EM_ANDAMENTO' },
        { progress: 0, status: 'FUTURO' }, // ignorada na média
      ],
      sessions: [
        { startedAt: new Date(), accumulatedSeconds: 3600 },
        { startedAt: new Date(), accumulatedSeconds: 1800 },
        { startedAt: null, accumulatedSeconds: 9999 }, // não trabalhada
      ],
      costPeriods: [
        { amount: 100, hours: 5 },
        { amount: 50, hours: 2 },
      ],
    },
    {
      id: 'p2',
      name: 'B',
      archived: true,
      tasks: [{ progress: 80, status: 'EM_ANDAMENTO' }],
      sessions: [],
      costPeriods: [],
    },
  ];

  it('agrega contagens, horas (accumulatedSeconds) e valores', async () => {
    const service = makeService(projects, 3);
    const r = await service.getSummary('u1');

    expect(r.projects).toBe(2);
    expect(r.activeProjects).toBe(1); // p2 arquivado
    expect(r.tasks).toBe(4);
    expect(r.sessions).toBe(2); // só as com startedAt
    expect(r.notes).toBe(3);
    expect(r.periods).toBe(2);
    expect(r.totalHours).toBeCloseTo(1.5, 5); // (3600+1800)/3600
    expect(r.totalBilled).toBeCloseTo(150, 5);
    expect(r.avgProgress).toBe(77); // média de [100,50,80], sem FUTURO
  });

  it('progresso por projeto ignora tasks FUTURO', async () => {
    const service = makeService(projects, 0);
    const r = await service.getSummary('u1');
    const p1 = r.perProject.find((p) => p.id === 'p1');
    expect(p1?.progress).toBe(75); // média de [100,50]
    expect(p1?.hours).toBeCloseTo(1.5, 5);
    expect(p1?.billed).toBe(150);
  });

  it('sem projetos → zeros', async () => {
    const service = makeService([], 0);
    const r = await service.getSummary('u1');
    expect(r.projects).toBe(0);
    expect(r.avgProgress).toBe(0);
    expect(r.totalHours).toBe(0);
    expect(r.perProject).toEqual([]);
  });
});
