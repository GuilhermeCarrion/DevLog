import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

// Módulo independente: a agenda funciona sozinha (itens pessoais)
// e também agrega dados dos projetos (sessões planejadas)
@Module({
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
