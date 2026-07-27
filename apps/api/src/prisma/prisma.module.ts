import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global: todo módulo enxerga o PrismaService sem precisar importar PrismaModule
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
