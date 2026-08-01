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
import { TagsService } from './tags.service';

class CreateTagDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsHexColor()
  color: string;
}

class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.tagsService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTagDto) {
    return this.tagsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tagsService.remove(user.id, id);
  }
}
