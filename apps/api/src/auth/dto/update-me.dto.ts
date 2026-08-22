import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Atualização dos próprios dados. Alterar email ou senha exige a senha atual
// (checado no service). `name` pode ser alterado livremente na sessão autenticada.
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A nova senha precisa de pelo menos 6 caracteres' })
  newPassword?: string;
}
