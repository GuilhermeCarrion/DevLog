import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { GroupsService } from './groups.service';

class GroupDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@Controller()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('projects/:projectId/groups')
  list(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.groupsService.list(user.id, projectId);
  }

  @Post('projects/:projectId/groups')
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: GroupDto,
  ) {
    return this.groupsService.create(user.id, projectId, dto.name);
  }

  @Patch('groups/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: GroupDto,
  ) {
    return this.groupsService.update(user.id, id, dto.name);
  }

  @Delete('groups/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groupsService.remove(user.id, id);
  }
}
