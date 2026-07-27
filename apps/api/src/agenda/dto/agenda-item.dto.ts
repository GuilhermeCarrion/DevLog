import { AgendaItemType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAgendaItemDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(AgendaItemType)
  type?: AgendaItemType;

  // Opcional de propósito: item pessoal (ex: "estudar NestJS") não tem projeto
  @IsOptional()
  @IsString()
  projectId?: string | null;
}

export class UpdateAgendaItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(AgendaItemType)
  type?: AgendaItemType;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsString()
  projectId?: string | null;
}
