import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAgendaItemDto,
  UpdateAgendaItemDto,
} from './dto/agenda-item.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  // Visão do mês: itens de agenda + sessões planejadas dos projetos do usuário.
  // month no formato "2026-07".
  async month(userId: string, month: string) {
    const range = this.monthRange(month);

    const [items, plannedSessions] = await Promise.all([
      this.prisma.agendaItem.findMany({
        where: { userId, date: { gte: range.start, lt: range.end } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.workSession.findMany({
        where: {
          project: { userId },
          startedAt: null,
          plannedFor: { gte: range.start, lt: range.end },
        },
        include: {
          project: { select: { id: true, name: true } },
          tasks: { select: { id: true, title: true } },
        },
        orderBy: { plannedFor: 'asc' },
      }),
    ]);

    return { items, plannedSessions };
  }

  async create(userId: string, dto: CreateAgendaItemDto) {
    if (dto.projectId) await this.assertProject(userId, dto.projectId);
    return this.prisma.agendaItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        type: dto.type,
        projectId: dto.projectId ?? null,
        userId,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateAgendaItemDto) {
    await this.assertOwnership(userId, id);
    if (dto.projectId) await this.assertProject(userId, dto.projectId);
    return this.prisma.agendaItem.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    return this.prisma.agendaItem.delete({ where: { id } });
  }

  // "2026-07" → [2026-07-01, 2026-08-01)
  private monthRange(month: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
    if (!match) {
      throw new BadRequestException('Parâmetro month deve ser YYYY-MM');
    }
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    return {
      start: new Date(year, monthIndex, 1),
      end: new Date(year, monthIndex + 1, 1),
    };
  }

  private async assertOwnership(userId: string, id: string) {
    const item = await this.prisma.agendaItem.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Item de agenda não encontrado');
  }

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
  }
}
