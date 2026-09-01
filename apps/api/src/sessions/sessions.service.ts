import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CaptureDto,
  CreatePlannedSessionDto,
  FinishSessionDto,
  QuickStartDto,
  UpdateSessionDto,
} from './dto/session.dto';

const SESSION_INCLUDE = {
  project: { select: { id: true, name: true } },
  // plano/sprint de origem (para o vínculo "parte de: <plano>")
  parent: { select: { id: true, name: true } },
  _count: { select: { children: true } },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
      // grupo p/ colorir os badges das tasks nos cards de sessão
      group: { select: { id: true, name: true, color: true } },
    },
  },
} as const;

// Segundos decorridos de um segmento em andamento (>= 0)
function segmentSeconds(runningSince: Date | null): number {
  if (!runningSince) return 0;
  return Math.max(0, Math.floor((Date.now() - runningSince.getTime()) / 1000));
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, projectId?: string) {
    return this.prisma.workSession.findMany({
      where: {
        project: { userId },
        ...(projectId ? { projectId } : {}),
      },
      include: SESSION_INCLUDE,
      orderBy: [{ startedAt: { sort: 'desc', nulls: 'first' } }],
    });
  }

  // Planos/sprints ativos (templates): startedAt null e ainda não concluídos.
  // Alimentam a lista "Sessão planejada" e podem ser iniciados N vezes.
  planned(userId: string) {
    return this.prisma.workSession.findMany({
      where: { project: { userId }, startedAt: null, plannedDoneAt: null },
      include: SESSION_INCLUDE,
      orderBy: { plannedFor: 'asc' },
    });
  }

  // Sessão aberta (startedAt != null && endedAt == null) — inclui pausada.
  // No máximo uma por usuário.
  active(userId: string) {
    return this.prisma.workSession.findFirst({
      where: { project: { userId }, startedAt: { not: null }, endedAt: null },
      include: SESSION_INCLUDE,
    });
  }

  // Cria um plano/sprint (template): startedAt null, com nome opcional
  async createPlanned(userId: string, dto: CreatePlannedSessionDto) {
    await this.assertProject(userId, dto.projectId);
    return this.prisma.workSession.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        plannedFor: new Date(dto.plannedFor),
        notes: dto.notes,
        tasks: dto.taskIds?.length
          ? { connect: dto.taskIds.map((id) => ({ id })) }
          : undefined,
      },
      include: SESSION_INCLUDE,
    });
  }

  async quickStart(userId: string, dto: QuickStartDto) {
    await this.assertProject(userId, dto.projectId);
    await this.assertNoActive(userId);
    const now = new Date();
    return this.prisma.workSession.create({
      data: { projectId: dto.projectId, startedAt: now, runningSince: now },
      include: SESSION_INCLUDE,
    });
  }

  // Inicia uma sessão A PARTIR de um plano/sprint: cria uma NOVA sessão
  // trabalhada que herda as tasks e a nota do plano. O plano continua na lista
  // (pode ser iniciado N vezes) até ser marcado como concluído.
  async start(userId: string, id: string) {
    const plan = await this.findOwned(userId, id);
    if (plan.startedAt) {
      throw new ConflictException('Isso não é um plano — já é uma sessão.');
    }
    await this.assertNoActive(userId);
    const full = await this.prisma.workSession.findUnique({
      where: { id },
      include: { tasks: { select: { id: true } } },
    });
    const now = new Date();
    return this.prisma.workSession.create({
      data: {
        projectId: plan.projectId,
        startedAt: now,
        runningSince: now,
        parentId: plan.id,
        notes: plan.notes, // herda a nota inicial do plano
        tasks: full?.tasks.length
          ? { connect: full.tasks.map((t) => ({ id: t.id })) }
          : undefined,
      },
      include: SESSION_INCLUDE,
    });
  }

  // Marca um plano/sprint como concluído — sai da lista de planejadas.
  async completePlan(userId: string, id: string) {
    const plan = await this.findOwned(userId, id);
    if (plan.startedAt) {
      throw new ConflictException('Só planos podem ser concluídos aqui.');
    }
    return this.prisma.workSession.update({
      where: { id },
      data: { plannedDoneAt: new Date() },
      include: SESSION_INCLUDE,
    });
  }

  // Pausa uma sessão em andamento: acumula o tempo ativo e zera o segmento.
  async pause(userId: string, id: string) {
    const session = await this.findOwned(userId, id);
    if (!session.startedAt || session.endedAt) {
      throw new ConflictException('Sessão não está ativa.');
    }
    if (!session.runningSince) {
      throw new ConflictException('Sessão já está pausada.');
    }
    return this.prisma.workSession.update({
      where: { id },
      data: {
        accumulatedSeconds:
          session.accumulatedSeconds + segmentSeconds(session.runningSince),
        runningSince: null,
      },
      include: SESSION_INCLUDE,
    });
  }

  // Retoma uma sessão pausada: reabre o segmento em andamento.
  async resume(userId: string, id: string) {
    const session = await this.findOwned(userId, id);
    if (!session.startedAt || session.endedAt) {
      throw new ConflictException('Sessão não está ativa.');
    }
    if (session.runningSince) {
      throw new ConflictException('Sessão já está em andamento.');
    }
    return this.prisma.workSession.update({
      where: { id },
      data: { runningSince: new Date() },
      include: SESSION_INCLUDE,
    });
  }

  // Captura rápida: concatena no que já existe (nunca sobrescreve)
  async capture(userId: string, id: string, dto: CaptureDto) {
    const session = await this.findOwned(userId, id);
    return this.prisma.workSession.update({
      where: { id },
      data: {
        notes: dto.notes ? this.append(session.notes, dto.notes) : undefined,
        commits: dto.commits
          ? this.append(session.commits, dto.commits)
          : undefined,
      },
      include: SESSION_INCLUDE,
    });
  }

  async finish(userId: string, id: string, dto: FinishSessionDto) {
    const session = await this.findOwned(userId, id);
    if (!session.startedAt || session.endedAt) {
      throw new ConflictException('Sessão não está ativa');
    }
    return this.prisma.workSession.update({
      where: { id },
      data: {
        endedAt: new Date(),
        // fecha o segmento em andamento no total ativo
        accumulatedSeconds:
          session.accumulatedSeconds + segmentSeconds(session.runningSince),
        runningSince: null,
        notes: dto.notes ?? undefined,
        commits: dto.commits ?? undefined,
        nextStep: dto.nextStep ?? undefined,
        tasks: dto.taskIds
          ? { set: dto.taskIds.map((taskId) => ({ id: taskId })) }
          : undefined,
      },
      include: SESSION_INCLUDE,
    });
  }

  async update(userId: string, id: string, dto: UpdateSessionDto) {
    await this.findOwned(userId, id);
    return this.prisma.workSession.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        plannedFor: dto.plannedFor ? new Date(dto.plannedFor) : undefined,
        notes: dto.notes ?? undefined,
        commits: dto.commits ?? undefined,
        nextStep: dto.nextStep ?? undefined,
        tasks: dto.taskIds
          ? { set: dto.taskIds.map((taskId) => ({ id: taskId })) }
          : undefined,
      },
      include: SESSION_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    // Desfaz vínculo N-N antes de apagar
    await this.prisma.workSession.update({
      where: { id },
      data: { tasks: { set: [] } },
    });
    return this.prisma.workSession.delete({ where: { id } });
  }

  private append(current: string | null, extra: string) {
    return current ? `${current}\n${extra}` : extra;
  }

  private async findOwned(userId: string, id: string) {
    const session = await this.prisma.workSession.findFirst({
      where: { id, project: { userId } },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
  }

  // Regra: uma sessão ativa por vez — encerre a atual antes de abrir outra
  private async assertNoActive(userId: string) {
    const activeSession = await this.active(userId);
    if (activeSession) {
      throw new ConflictException(
        'Você já tem uma sessão ativa. Encerre-a antes de iniciar outra.',
      );
    }
  }
}
