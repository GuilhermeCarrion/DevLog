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

  // Sessões planejadas ainda não iniciadas — alimentam o botão "Sessão planejada"
  planned(userId: string) {
    return this.prisma.workSession.findMany({
      where: { project: { userId }, startedAt: null },
      include: SESSION_INCLUDE,
      orderBy: { plannedFor: 'asc' },
    });
  }

  // Sessão ativa (startedAt != null && endedAt == null) — no máximo uma por usuário
  active(userId: string) {
    return this.prisma.workSession.findFirst({
      where: { project: { userId }, startedAt: { not: null }, endedAt: null },
      include: SESSION_INCLUDE,
    });
  }

  async createPlanned(userId: string, dto: CreatePlannedSessionDto) {
    await this.assertProject(userId, dto.projectId);
    return this.prisma.workSession.create({
      data: {
        projectId: dto.projectId,
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
    return this.prisma.workSession.create({
      data: { projectId: dto.projectId, startedAt: new Date() },
      include: SESSION_INCLUDE,
    });
  }

  // Inicia uma sessão planejada: só marca startedAt — tasks/notas já vêm do planejamento
  async start(userId: string, id: string) {
    const session = await this.findOwned(userId, id);
    if (session.startedAt) {
      throw new ConflictException('Sessão já foi iniciada');
    }
    await this.assertNoActive(userId);
    return this.prisma.workSession.update({
      where: { id },
      data: { startedAt: new Date() },
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
