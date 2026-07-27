import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca rotas que não exigem autenticação (login, register)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
