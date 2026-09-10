import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateCalcSettingsDto,
  UpdateCostDto,
  UpdatePeriodCategoryDto,
  UpdatePeriodDto,
  UpsertCostDto,
  UpsertPeriodCategoryDto,
  UpsertPeriodDto,
} from './dto/cost.dto';

@Injectable()
export class CostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- itens de custo por projeto ----------

  listItems(userId: string, projectId: string) {
    // Só itens ativos (periodId null) — os arquivados vivem dentro de um período.
    return this.prisma.costItem.findMany({
      where: { projectId, project: { userId }, periodId: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createItem(userId: string, projectId: string, dto: UpsertCostDto) {
    await this.assertProject(userId, projectId);
    const count = await this.prisma.costItem.count({ where: { projectId } });
    return this.prisma.costItem.create({
      data: {
        projectId,
        name: dto.name,
        category: dto.category,
        kind: dto.kind,
        amount: dto.amount,
        hours: dto.hours ?? null,
        position: count,
      },
    });
  }

  async updateItem(userId: string, id: string, dto: UpdateCostDto) {
    await this.assertItem(userId, id);
    return this.prisma.costItem.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        kind: dto.kind,
        amount: dto.amount,
        hours: dto.hours === undefined ? undefined : dto.hours,
      },
    });
  }

  async removeItem(userId: string, id: string) {
    await this.assertItem(userId, id);
    return this.prisma.costItem.delete({ where: { id } });
  }

  // ---------- templates reutilizáveis do usuário ----------

  listTemplates(userId: string) {
    return this.prisma.costTemplate.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  createTemplate(userId: string, dto: UpsertCostDto) {
    return this.prisma.costTemplate.create({
      data: {
        userId,
        name: dto.name,
        category: dto.category,
        kind: dto.kind,
        amount: dto.amount,
        hours: dto.hours ?? null,
      },
    });
  }

  async updateTemplate(userId: string, id: string, dto: UpdateCostDto) {
    await this.assertTemplate(userId, id);
    return this.prisma.costTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        kind: dto.kind,
        amount: dto.amount,
        hours: dto.hours === undefined ? undefined : dto.hours,
      },
    });
  }

  async removeTemplate(userId: string, id: string) {
    await this.assertTemplate(userId, id);
    return this.prisma.costTemplate.delete({ where: { id } });
  }

  // ---------- settings (defaults globais) ----------

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultHourlyRate: true, defaultMargin: true },
    });
    return user;
  }

  updateSettings(userId: string, dto: UpdateCalcSettingsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultHourlyRate: dto.defaultHourlyRate,
        defaultMargin: dto.defaultMargin,
      },
      select: { defaultHourlyRate: true, defaultMargin: true },
    });
  }

  // ---------- categorias de período (reutilizáveis por usuário) ----------

  listPeriodCategories(userId: string) {
    return this.prisma.periodCategory.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  createPeriodCategory(userId: string, dto: UpsertPeriodCategoryDto) {
    return this.prisma.periodCategory.create({
      data: { userId, name: dto.name, color: dto.color },
    });
  }

  async updatePeriodCategory(
    userId: string,
    id: string,
    dto: UpdatePeriodCategoryDto,
  ) {
    await this.assertPeriodCategory(userId, id);
    return this.prisma.periodCategory.update({
      where: { id },
      data: { name: dto.name, color: dto.color },
    });
  }

  async removePeriodCategory(userId: string, id: string) {
    await this.assertPeriodCategory(userId, id);
    // periods.categoryId vira null (onDelete: SetNull no schema)
    return this.prisma.periodCategory.delete({ where: { id } });
  }

  // ---------- lançamentos de período por projeto ----------

  listPeriods(userId: string, projectId: string) {
    return this.prisma.costPeriod.findMany({
      where: { projectId, project: { userId } },
      orderBy: { startDate: 'desc' },
      include: {
        category: true,
        items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
        walletTransaction: { select: { id: true } }, // já lançado na Carteira?
      },
    });
  }

  // Salva um período: cria o lançamento e ARQUIVA nele todos os custos ativos do
  // projeto (periodId null → id do período), limpando a lista "Custos lançados".
  async createPeriod(userId: string, projectId: string, dto: UpsertPeriodDto) {
    await this.assertProject(userId, projectId);
    if (dto.categoryId) await this.assertPeriodCategory(userId, dto.categoryId);
    return this.prisma.$transaction(async (tx) => {
      const period = await tx.costPeriod.create({
        data: {
          projectId,
          categoryId: dto.categoryId ?? null,
          label: dto.label ?? null,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          hours: dto.hours,
          amount: dto.amount,
          note: dto.note ?? null,
        },
      });
      await tx.costItem.updateMany({
        where: { projectId, periodId: null },
        data: { periodId: period.id },
      });
      return tx.costPeriod.findUnique({
        where: { id: period.id },
        include: { category: true, items: true },
      });
    });
  }

  // Reabre um período: devolve os custos arquivados para a lista ativa
  // (periodId → null) e remove o lançamento do histórico.
  async reopenPeriod(userId: string, id: string) {
    await this.assertPeriod(userId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.costItem.updateMany({
        where: { periodId: id },
        data: { periodId: null },
      });
      await tx.costPeriod.delete({ where: { id } });
      return { ok: true };
    });
  }

  async updatePeriod(userId: string, id: string, dto: UpdatePeriodDto) {
    await this.assertPeriod(userId, id);
    if (dto.categoryId) await this.assertPeriodCategory(userId, dto.categoryId);
    return this.prisma.costPeriod.update({
      where: { id },
      data: {
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        label: dto.label === undefined ? undefined : dto.label,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        hours: dto.hours,
        amount: dto.amount,
        note: dto.note === undefined ? undefined : dto.note,
      },
      include: { category: true, items: true },
    });
  }

  // Exclui um período permanentemente, junto com os custos arquivados nele.
  async removePeriod(userId: string, id: string) {
    await this.assertPeriod(userId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.costItem.deleteMany({ where: { periodId: id } });
      return tx.costPeriod.delete({ where: { id } });
    });
  }

  // ---------- helpers de ownership ----------

  private async assertProject(userId: string, projectId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Projeto não encontrado');
  }

  private async assertItem(userId: string, id: string) {
    const item = await this.prisma.costItem.findFirst({
      where: { id, project: { userId } },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Item de custo não encontrado');
  }

  private async assertTemplate(userId: string, id: string) {
    const tpl = await this.prisma.costTemplate.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!tpl) throw new NotFoundException('Custo padrão não encontrado');
  }

  private async assertPeriodCategory(userId: string, id: string) {
    const cat = await this.prisma.periodCategory.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!cat)
      throw new NotFoundException('Categoria de período não encontrada');
  }

  private async assertPeriod(userId: string, id: string) {
    const period = await this.prisma.costPeriod.findFirst({
      where: { id, project: { userId } },
      select: { id: true },
    });
    if (!period) throw new NotFoundException('Lançamento não encontrado');
  }
}
