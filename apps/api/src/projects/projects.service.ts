import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // Toda query filtra por userId — um usuário nunca enxerga projetos de outro
  list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { tasks: true, sessions: true, notes: true } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        groups: true,
        _count: { select: { tasks: true, sessions: true, notes: true } },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return project;
  }

  create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { name: dto.name, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  // Garante que o recurso pertence ao usuário antes de qualquer escrita
  private async assertOwnership(userId: string, id: string) {
    const found = await this.prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Projeto não encontrado');
  }
}
