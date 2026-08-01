import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

// Tags sempre acompanham o projeto nas respostas (usadas na UI)
const PROJECT_INCLUDE = {
  tags: true,
  _count: { select: { tasks: true, sessions: true, notes: true } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // Toda query filtra por userId — um usuário nunca enxerga projetos de outro
  list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
      include: PROJECT_INCLUDE,
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: { ...PROJECT_INCLUDE, groups: { orderBy: { name: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    await this.assertTagsOwnership(userId, dto.tagIds);
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        userId,
        tags: dto.tagIds?.length
          ? { connect: dto.tagIds.map((id) => ({ id })) }
          : undefined,
      },
      include: PROJECT_INCLUDE,
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.assertOwnership(userId, id);
    await this.assertTagsOwnership(userId, dto.tagIds);
    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        archived: dto.archived,
        // tagIds presente (mesmo []) substitui o conjunto; ausente mantém
        tags: dto.tagIds
          ? { set: dto.tagIds.map((tagId) => ({ id: tagId })) }
          : undefined,
      },
      include: PROJECT_INCLUDE,
    });
  }

  // Garante que o recurso pertence ao usuário antes de qualquer escrita
  private async assertOwnership(userId: string, id: string) {
    const found = await this.prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Projeto não encontrado');
  }

  // Impede vincular tag de outro usuário
  private async assertTagsOwnership(userId: string, tagIds?: string[]) {
    if (!tagIds?.length) return;
    const count = await this.prisma.tag.count({
      where: { id: { in: tagIds }, userId },
    });
    if (count !== tagIds.length) {
      throw new NotFoundException('Tag não encontrada');
    }
  }
}
