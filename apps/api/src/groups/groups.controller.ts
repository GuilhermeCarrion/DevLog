import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
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

  @IsOptional()
  @IsBoolean()
  priority?: boolean;
}

class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsBoolean()
  priority?: boolean;
}

class ReorderGroupsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
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

  @Patch('projects/:projectId/groups/reorder')
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: ReorderGroupsDto,
  ) {
    return this.groupsService.reorder(user.id, projectId, dto.ids);
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
