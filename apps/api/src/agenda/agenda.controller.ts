import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { AgendaService } from './agenda.service';
import {
  CreateAgendaItemDto,
  UpdateAgendaItemDto,
} from './dto/agenda-item.dto';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  month(@CurrentUser() user: AuthUser, @Query('month') month: string) {
    return this.agendaService.month(user.id, month);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgendaItemDto) {
    return this.agendaService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAgendaItemDto,
  ) {
    return this.agendaService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agendaService.remove(user.id, id);
  }
}
