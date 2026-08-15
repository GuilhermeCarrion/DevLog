import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CostsService } from './costs.service';
import {
  UpdateCalcSettingsDto,
  UpdateCostDto,
  UpdatePeriodCategoryDto,
  UpdatePeriodDto,
  UpsertCostDto,
  UpsertPeriodCategoryDto,
  UpsertPeriodDto,
} from './dto/cost.dto';

@Controller()
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  // ----- itens por projeto -----
  @Get('projects/:projectId/costs')
  listItems(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.costsService.listItems(user.id, projectId);
  }

  @Post('projects/:projectId/costs')
  createItem(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertCostDto,
  ) {
    return this.costsService.createItem(user.id, projectId, dto);
  }

  @Patch('costs/:id')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCostDto,
  ) {
    return this.costsService.updateItem(user.id, id, dto);
  }

  @Delete('costs/:id')
  removeItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.costsService.removeItem(user.id, id);
  }

  // ----- templates reutilizáveis -----
  @Get('cost-templates')
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.costsService.listTemplates(user.id);
  }

  @Post('cost-templates')
  createTemplate(@CurrentUser() user: AuthUser, @Body() dto: UpsertCostDto) {
    return this.costsService.createTemplate(user.id, dto);
  }

  @Patch('cost-templates/:id')
  updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCostDto,
  ) {
    return this.costsService.updateTemplate(user.id, id, dto);
  }

  @Delete('cost-templates/:id')
  removeTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.costsService.removeTemplate(user.id, id);
  }

  // ----- settings (defaults) -----
  @Get('calc-settings')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.costsService.getSettings(user.id);
  }

  @Patch('calc-settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCalcSettingsDto,
  ) {
    return this.costsService.updateSettings(user.id, dto);
  }

  // ----- categorias de período (reutilizáveis) -----
  @Get('period-categories')
  listPeriodCategories(@CurrentUser() user: AuthUser) {
    return this.costsService.listPeriodCategories(user.id);
  }

  @Post('period-categories')
  createPeriodCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPeriodCategoryDto,
  ) {
    return this.costsService.createPeriodCategory(user.id, dto);
  }

  @Patch('period-categories/:id')
  updatePeriodCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePeriodCategoryDto,
  ) {
    return this.costsService.updatePeriodCategory(user.id, id, dto);
  }

  @Delete('period-categories/:id')
  removePeriodCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.costsService.removePeriodCategory(user.id, id);
  }

  // ----- lançamentos de período por projeto -----
  @Get('projects/:projectId/periods')
  listPeriods(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.costsService.listPeriods(user.id, projectId);
  }

  @Post('projects/:projectId/periods')
  createPeriod(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertPeriodDto,
  ) {
    return this.costsService.createPeriod(user.id, projectId, dto);
  }

  @Patch('periods/:id')
  updatePeriod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePeriodDto,
  ) {
    return this.costsService.updatePeriod(user.id, id, dto);
  }

  // Reabrir: devolve os custos arquivados para a lista ativa e apaga o histórico
  @Post('periods/:id/reopen')
  reopenPeriod(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.costsService.reopenPeriod(user.id, id);
  }

  @Delete('periods/:id')
  removePeriod(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.costsService.removePeriod(user.id, id);
  }
}
