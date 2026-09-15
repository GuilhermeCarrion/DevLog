import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GroupData {
  name?: string;
  color?: string | null;
  priority?: boolean;
}

// Grupos priorizados sempre primeiro; depois pela ordem manual; empate por nome.
const GROUP_ORDER = [
  { priority: 'desc' as const },
  { order: 'asc' as const },
  { name: 'asc' as const },
];

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, projectId: string) {
    return this.prisma.group.findMany({
      where: { projectId, project: { userId } },
      orderBy: GROUP_ORDER,
    });
  }

  async create(userId: string, projectId: string, data: GroupData) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    // Novo grupo entra no fim da ordem manual
    const agg = await this.prisma.group.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    return this.prisma.group.create({
      data: {
        name: data.name ?? '',
        color: data.color,
        priority: data.priority ?? false,
        order: (agg._max.order ?? -1) + 1,
        projectId,
      },
    });
  }

  async update(userId: string, id: string, data: GroupData) {
    await this.assertOwnership(userId, id);
    return this.prisma.group.update({
      where: { id },
      data: { name: data.name, color: data.color, priority: data.priority },
    });
  }

  // Reordena os grupos do projeto: order = posição na lista recebida.
  async reorder(userId: string, projectId: string, ids: string[]) {
    const groups = await this.prisma.group.findMany({
      where: { projectId, project: { userId } },
      select: { id: true },
    });
    const owned = new Set(groups.map((g) => g.id));
    // Só aceita se todos os ids pertencem ao projeto do usuário
    if (ids.length !== owned.size || !ids.every((id) => owned.has(id))) {
      throw new NotFoundException('Lista de grupos inválida');
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.group.update({ where: { id }, data: { order: index } }),
      ),
    );
    return this.list(userId, projectId);
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
