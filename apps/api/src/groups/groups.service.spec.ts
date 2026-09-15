import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  describe('reorder', () => {
    function makePrisma(existingIds: string[]) {
      const updates: { id: string; order: number }[] = [];
      const group = {
        findMany: jest
          .fn()
          .mockResolvedValue(existingIds.map((id) => ({ id }))),
        update: jest
          .fn()
          .mockImplementation(
            (args: { where: { id: string }; data: { order: number } }) => {
              updates.push({ id: args.where.id, order: args.data.order });
              return Promise.resolve({ id: args.where.id });
            },
          ),
      };
      const prisma = {
        group,
        // executa os updates do array na ordem recebida
        $transaction: jest
          .fn()
          .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
      } as unknown as PrismaService;
      return { prisma, updates };
    }

    it('atribui order = posição para cada grupo na lista recebida', async () => {
      const { prisma, updates } = makePrisma(['a', 'b', 'c']);
      const service = new GroupsService(prisma);
      // findMany é chamado 2x (validação + list final); o 2º devolve a mesma lista
      await service.reorder('u1', 'p1', ['c', 'a', 'b']);

      expect(updates).toEqual([
        { id: 'c', order: 0 },
        { id: 'a', order: 1 },
        { id: 'b', order: 2 },
      ]);
    });

    it('rejeita quando a lista não bate com os grupos do projeto', async () => {
      const { prisma } = makePrisma(['a', 'b', 'c']);
      const service = new GroupsService(prisma);
      await expect(
        service.reorder('u1', 'p1', ['a', 'b']), // faltando "c"
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejeita ids estranhos ao projeto', async () => {
      const { prisma } = makePrisma(['a', 'b', 'c']);
      const service = new GroupsService(prisma);
      await expect(
        service.reorder('u1', 'p1', ['a', 'b', 'x']),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
