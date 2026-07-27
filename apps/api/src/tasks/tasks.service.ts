import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(
    userId: string,
    projectId: string,
    filters: { status?: TaskStatus; groupId?: string },
  ) {
    return this.prisma.task.findMany({
      where: {
        projectId,
        project: { userId },
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.groupId ? { groupId: filters.groupId } : {}),
      },
      include: { group: true },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return this.prisma.task.create({
      data: { ...dto, projectId },
      include: { group: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.task.update({
      where: { id },
      data: dto,
      include: { group: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    // Desfaz o vínculo N-N com sessões antes de apagar
    await this.prisma.task.update({
      where: { id },
      data: { sessions: { set: [] } },
    });
    return this.prisma.task.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const found = await this.prisma.task.findFirst({
      where: { id, project: { userId } },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Task não encontrada');
  }
}
