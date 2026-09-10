import { RecurrenceInterval, TxType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

// ---------- Categorias ----------

export class UpsertWalletCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  color: string; // hex
}

export class UpdateWalletCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  color?: string;
}

// ---------- Transações ----------

export class CreateTransactionDto {
  @IsEnum(TxType)
  type: TxType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TxType)
  type?: TxType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

// Filtros da listagem (query string). `month` no formato YYYY-MM.
export class TransactionsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month deve estar no formato YYYY-MM' })
  month?: string;

  @IsOptional()
  @IsEnum(TxType)
  type?: TxType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  paid?: string;
}

export class MonthQueryDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'month deve estar no formato YYYY-MM' })
  month: string;
}

// ---------- Recorrentes ----------

export class CreateRecurringDto {
  @IsEnum(TxType)
  type: TxType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(RecurrenceInterval)
  interval?: RecurrenceInterval;

  @IsOptional()
  @IsInt()
  @Min(1)
  dayOfMonth?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}

export class UpdateRecurringDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  dayOfMonth?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ---------- Parcelas ----------

export class CreateInstallmentDto {
  @IsOptional()
  @IsEnum(TxType)
  type?: TxType;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsInt()
  @Min(1)
  installmentsCount: number;

  @IsDateString()
  firstDueDate: string;
}

// Só descrição/categoria são editáveis (total e nº de parcelas são fixos).
export class UpdateInstallmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
