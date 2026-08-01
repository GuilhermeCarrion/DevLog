import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  // Substitui o conjunto de tags do projeto (set)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
