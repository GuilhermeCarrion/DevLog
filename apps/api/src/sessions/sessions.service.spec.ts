import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  describe('update — prazo (dueAt)', () => {
    function makeService() {
      let captured: { dueAt?: Date | null } = {};
      const prisma = {
        workSession: {
          findFirst: jest.fn().mockResolvedValue({ id: 's1' }),
          update: jest
            .fn()
            .mockImplementation((args: { data: { dueAt?: Date | null } }) => {
              captured = args.data;
              return Promise.resolve({ id: 's1' });
            }),
        },
      } as unknown as PrismaService;
      return {
        service: new SessionsService(prisma),
        data: () => captured,
      };
    }

    it('define o prazo quando recebe uma data', async () => {
      const { service, data } = makeService();
      await service.update('u1', 's1', { dueAt: '2026-09-20T10:00:00.000Z' });
      expect(data().dueAt).toEqual(new Date('2026-09-20T10:00:00.000Z'));
    });

    it('limpa o prazo (null) quando recebe string vazia', async () => {
      const { service, data } = makeService();
      await service.update('u1', 's1', { dueAt: '' });
      expect(data().dueAt).toBeNull();
    });

    it('mantém o prazo (undefined) quando o campo não é enviado', async () => {
      const { service, data } = makeService();
      await service.update('u1', 's1', { notes: 'oi' });
      expect(data().dueAt).toBeUndefined();
    });
  });
});
