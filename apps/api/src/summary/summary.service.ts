import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Resumo agregado do usuário: contagens, horas, valores cobrados e progresso —
// por projeto e no total. Tudo derivado em uma leitura só, calculado em JS
// (volume pessoal, sem necessidade de agregação SQL pesada).
@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        archived: true,
        tasks: { select: { progress: true, status: true } },
        sessions: { select: { startedAt: true, accumulatedSeconds: true } },
        costPeriods: { select: { amount: true, hours: true } },
      },
    });

    // Notas incluem as sem projeto → conta pelo dono
    const notesCount = await this.prisma.note.count({ where: { userId } });

    const perProject = projects.map((p) => {
      const consideradas = p.tasks.filter((t) => t.status !== 'FUTURO');
      const progress =
        consideradas.length > 0
          ? Math.round(
              consideradas.reduce((a, t) => a + t.progress, 0) /
                consideradas.length,
            )
          : 0;
      const worked = p.sessions.filter((s) => s.startedAt !== null);
      const hours = worked.reduce((a, s) => a + s.accumulatedSeconds, 0) / 3600;
      const billed = p.costPeriods.reduce((a, c) => a + c.amount, 0);
      return {
        id: p.id,
        name: p.name,
        archived: p.archived,
        tasks: p.tasks.length,
        sessions: worked.length,
        periods: p.costPeriods.length,
        hours: round1(hours),
        billed: round2(billed),
        progress,
      };
    });

    const allTasks = projects.flatMap((p) => p.tasks);
    const consideradas = allTasks.filter((t) => t.status !== 'FUTURO');
    const avgProgress =
      consideradas.length > 0
        ? Math.round(
            consideradas.reduce((a, t) => a + t.progress, 0) /
              consideradas.length,
          )
        : 0;

    return {
      projects: projects.length,
      activeProjects: projects.filter((p) => !p.archived).length,
      tasks: allTasks.length,
      sessions: perProject.reduce((a, p) => a + p.sessions, 0),
      notes: notesCount,
      periods: perProject.reduce((a, p) => a + p.periods, 0),
      totalHours: round1(perProject.reduce((a, p) => a + p.hours, 0)),
      totalBilled: round2(perProject.reduce((a, p) => a + p.billed, 0)),
      avgProgress,
      perProject,
    };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
