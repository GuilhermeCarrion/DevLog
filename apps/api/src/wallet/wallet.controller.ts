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
  CreateInstallmentDto,
  CreateRecurringDto,
  CreateTransactionDto,
  MonthQueryDto,
  TransactionsQueryDto,
  UpdateInstallmentDto,
  UpdateRecurringDto,
  UpdateTransactionDto,
  UpsertWalletCategoryDto,
  UpdateWalletCategoryDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  // ----- categorias -----
  @Get('categories')
  listCategories(@CurrentUser() u: AuthUser) {
    return this.wallet.listCategories(u.id);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() u: AuthUser,
    @Body() dto: UpsertWalletCategoryDto,
  ) {
    return this.wallet.createCategory(u.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWalletCategoryDto,
  ) {
    return this.wallet.updateCategory(u.id, id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.wallet.removeCategory(u.id, id);
  }

  // ----- transações -----
  @Get('transactions')
  listTransactions(
    @CurrentUser() u: AuthUser,
    @Query() q: TransactionsQueryDto,
  ) {
    return this.wallet.listTransactions(u.id, q);
  }

  @Post('transactions')
  createTransaction(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.wallet.createTransaction(u.id, dto);
  }

  @Patch('transactions/:id')
  updateTransaction(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.wallet.updateTransaction(u.id, id, dto);
  }

  @Post('transactions/:id/toggle-paid')
  togglePaid(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.wallet.togglePaid(u.id, id);
  }

  @Delete('transactions/:id')
  removeTransaction(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.wallet.removeTransaction(u.id, id);
  }

  // ----- recorrentes -----
  @Get('recurring')
  listRecurring(@CurrentUser() u: AuthUser) {
    return this.wallet.listRecurring(u.id);
  }

  @Post('recurring')
  createRecurring(@CurrentUser() u: AuthUser, @Body() dto: CreateRecurringDto) {
    return this.wallet.createRecurring(u.id, dto);
  }

  @Patch('recurring/:id')
  updateRecurring(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.wallet.updateRecurring(u.id, id, dto);
  }

  @Delete('recurring/:id')
  removeRecurring(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query('keep') keep?: string,
  ) {
    return this.wallet.removeRecurring(u.id, id, keep === 'true');
  }

  // ----- parcelas -----
  @Get('installments')
  listInstallments(@CurrentUser() u: AuthUser) {
    return this.wallet.listInstallments(u.id);
  }

  @Post('installments')
  createInstallment(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateInstallmentDto,
  ) {
    return this.wallet.createInstallment(u.id, dto);
  }

  @Patch('installments/:id')
  updateInstallment(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInstallmentDto,
  ) {
    return this.wallet.updateInstallment(u.id, id, dto);
  }

  @Delete('installments/:id')
  removeInstallment(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.wallet.removeInstallment(u.id, id);
  }

  // ----- resumo -----
  @Get('summary')
  summary(@CurrentUser() u: AuthUser, @Query() q: MonthQueryDto) {
    return this.wallet.summary(u.id, q.month);
  }

  // ----- integração com a Calculadora -----
  @Post('from-cost-period/:costPeriodId')
  fromCostPeriod(
    @CurrentUser() u: AuthUser,
    @Param('costPeriodId') costPeriodId: string,
  ) {
    return this.wallet.fromCostPeriod(u.id, costPeriodId);
  }
}
