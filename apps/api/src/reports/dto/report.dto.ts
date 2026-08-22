import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// Query da tela de candidatos (De/Até)
export class CandidatesQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

// Uma linha final (editada pelo usuário) de uma das tabelas do relatório
export class ReportRowDto {
  @IsString()
  tarefa: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percent?: number | null;

  @IsString()
  justificativa: string;
}

// Geração do relatório: intervalo de datas (De/Até) + overrides do cabeçalho.
// `realizadas`/`proximas`: linhas finais editadas na tela de revisão. Se
// ausentes, o backend deriva automaticamente das sessões (retrocompatível).
export class GenerateReportDto {
  @IsDateString()
  from: string; // yyyy-mm-dd — início do intervalo (inclusivo)

  @IsDateString()
  to: string; // yyyy-mm-dd — fim do intervalo (inclusivo, dia inteiro)

  @IsOptional()
  @IsString()
  semana?: string; // ex: "20/2026" — default: semana ISO de `to`

  @IsOptional()
  @IsString()
  data?: string; // ex: "20/07/2026" — default: `to` formatado

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentTotal?: number; // default: média de progress das tasks (status != FUTURO)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportRowDto)
  realizadas?: ReportRowDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportRowDto)
  proximas?: ReportRowDto[];
}

// Metadados do cabeçalho do relatório (upsert por projeto). Alimenta as tags
// escalares do template. Helper mínimo para o "coração" ficar testável — a tela
// de configuração completa vem no vertical maior.
export class UpsertReportProfileDto {
  @IsString()
  @MinLength(1)
  grupoTurma: string;

  @IsString()
  @MinLength(1)
  aluno: string;

  @IsString()
  @MinLength(1)
  ra: string;

  @IsString()
  @MinLength(1)
  curso: string;

  @IsString()
  @MinLength(1)
  termo: string;

  @IsString()
  @MinLength(1)
  orientador: string;

  @IsOptional()
  @IsString()
  coorientador?: string | null;

  @IsString()
  @MinLength(1)
  tema: string;

  @IsString()
  @MinLength(1)
  area: string;
}
