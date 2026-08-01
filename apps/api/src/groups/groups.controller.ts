import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { GroupsService } from './groups.service';

class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
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
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.create(user.id, projectId, dto);
  }

  @Patch('groups/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(user.id, id, dto);
  }

  @Delete('groups/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groupsService.remove(user.id, id);
  }
}
