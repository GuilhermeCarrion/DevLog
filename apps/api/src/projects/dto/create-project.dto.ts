import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // ids de tags do usuário a vincular ao projeto
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
