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
import {
  CaptureDto,
  CreatePlannedSessionDto,
  FinishSessionDto,
  QuickStartDto,
  UpdateSessionDto,
} from './dto/session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.sessionsService.list(user.id, projectId);
  }

  @Get('planned')
  planned(@CurrentUser() user: AuthUser) {
    return this.sessionsService.planned(user.id);
  }

  @Get('active')
  active(@CurrentUser() user: AuthUser) {
    return this.sessionsService.active(user.id);
  }

  @Post('planned')
  createPlanned(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlannedSessionDto,
  ) {
    return this.sessionsService.createPlanned(user.id, dto);
  }

  @Post('quick-start')
  quickStart(@CurrentUser() user: AuthUser, @Body() dto: QuickStartDto) {
    return this.sessionsService.quickStart(user.id, dto);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessionsService.start(user.id, id);
  }

  @Post(':id/capture')
  capture(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CaptureDto,
  ) {
    return this.sessionsService.capture(user.id, id, dto);
  }

  @Post(':id/finish')
  finish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FinishSessionDto,
  ) {
    return this.sessionsService.finish(user.id, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessionsService.remove(user.id, id);
  }
}
