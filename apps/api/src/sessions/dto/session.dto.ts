import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

// Plano/sprint (template): criado no planejamento, começa sem startedAt e pode
// ser iniciado N vezes.
export class CreatePlannedSessionDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  name?: string; // nome do plano/sprint

  @IsDateString()
  plannedFor: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];
}

// Início rápido: 1 clique + projeto = sessão ativa
export class QuickStartDto {
  @IsString()
  projectId: string;
}

// Captura rápida durante a sessão: texto é CONCATENADO, nunca substitui
export class CaptureDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  commits?: string;
}

// Encerramento: nenhum campo obrigatório (salva em branco se preciso)
export class FinishSessionDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  commits?: string;

  @IsOptional()
  @IsString()
  nextStep?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];
}

// Edição de sessão já encerrada (ou plano)
export class UpdateSessionDto extends FinishSessionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  plannedFor?: string;
}
