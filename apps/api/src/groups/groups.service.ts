import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GroupData {
  name?: string;
  color?: string | null;
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, projectId: string) {
    return this.prisma.group.findMany({
      where: { projectId, project: { userId } },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, projectId: string, data: GroupData) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return this.prisma.group.create({
      data: { name: data.name ?? '', color: data.color, projectId },
    });
  }

  async update(userId: string, id: string, data: GroupData) {
    await this.assertOwnership(userId, id);
    return this.prisma.group.update({
      where: { id },
      data: { name: data.name, color: data.color },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    // Tasks do grupo não são apagadas — só ficam sem grupo
    await this.prisma.task.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });
    return this.prisma.group.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const found = await this.prisma.group.findFirst({
      // Ownership indireta: o grupo é meu se o projeto dele é meu
      where: { id, project: { userId } },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Grupo não encontrado');
  }
}
