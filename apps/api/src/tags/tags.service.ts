import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, data: { name: string; color: string }) {
    try {
      return await this.prisma.tag.create({
        data: { name: data.name, color: data.color, userId },
      });
    } catch (e) {
      // @@unique([userId, name]) — nome de tag repetido
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Você já tem uma tag com esse nome');
      }
      throw e;
    }
  }

  async update(
    userId: string,
    id: string,
    data: { name?: string; color?: string },
  ) {
    await this.assertOwnership(userId, id);
    return this.prisma.tag.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    // Prisma desfaz os vínculos M2M automaticamente ao deletar a tag
    return this.prisma.tag.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!tag) throw new NotFoundException('Tag não encontrada');
  }
}
