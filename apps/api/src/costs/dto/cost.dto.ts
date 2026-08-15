import { CostCategory, CostKind } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

// Item de custo dentro de um projeto, ou template reutilizável do usuário.
export class UpsertCostDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(CostCategory)
  category: CostCategory;

  @IsEnum(CostKind)
  kind: CostKind;

  @IsNumber()
  @Min(0)
  amount: number; // FIXED: valor; HOURLY: valor/hora

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number | null; // HOURLY: horas (null = puxa das sessões)
}

export class UpdateCostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(CostCategory)
  category?: CostCategory;

  @IsOptional()
  @IsEnum(CostKind)
  kind?: CostKind;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number | null;
}

export class UpdateCalcSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultHourlyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultMargin?: number;
}

// ---------- Períodos de cobrança ----------

// Categoria de período (ex: "Pago"), reutilizável por usuário — nome + cor.
export class UpsertPeriodCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  color: string; // hex
}

export class UpdatePeriodCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  color?: string;
}

// Lançamento de período (registro histórico de um intervalo de datas do projeto).
export class UpsertPeriodDto {
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  hours: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdatePeriodDto {
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}
