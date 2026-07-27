import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto } from './notes.controller';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, projectId?: string) {
    return this.prisma.note.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateNoteDto) {
    if (dto.projectId) await this.assertProject(userId, dto.projectId);
    return this.prisma.note.create({
      data: { ...dto, userId },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.assertOwnership(userId, id);
    if (dto.projectId) await this.assertProject(userId, dto.projectId);
    return this.prisma.note.update({
      where: { id },
      data: dto,
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    return this.prisma.note.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!note) throw new NotFoundException('Nota não encontrada');
  }

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
  }
}
