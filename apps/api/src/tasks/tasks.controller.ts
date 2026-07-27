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
import { TaskStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  list(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('groupId') groupId?: string,
  ) {
    return this.tasksService.list(user.id, projectId, { status, groupId });
  }

  @Post('projects/:projectId/tasks')
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.id, projectId, dto);
  }

  @Patch('tasks/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete('tasks/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.remove(user.id, id);
  }
}
