import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AUTH_COOKIE } from './jwt-auth.guard';
import { Public } from './public.decorator';

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 dias, igual à expiração do JWT

const IS_PROD = process.env.NODE_ENV === 'production';

// Em produção web (Vercel) e api (Railway) ficam em domínios diferentes → o
// cookie é cross-site, e o browser só o armazena/envia com sameSite:'none' +
// secure:true (obrigatoriamente https). Em dev, lax + inseguro (http local).
const COOKIE_BASE = {
  httpOnly: true as const, // JS do browser não lê o cookie — mitiga XSS roubando token
  sameSite: IS_PROD ? ('none' as const) : ('lax' as const),
  secure: IS_PROD,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.register(dto);
    this.setCookie(res, token);
    return user;
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(dto);
    this.setCookie(res, token);
    return user;
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    // clearCookie precisa das MESMAS opções (sameSite/secure) do set, senão o
    // browser não casa o cookie e não apaga.
    res.clearCookie(AUTH_COOKIE, COOKIE_BASE);
    return { ok: true };
  }

  // O front usa esta rota para saber quem está logado (fonte de verdade da sessão)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  private setCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, { ...COOKIE_BASE, maxAge: COOKIE_MAX_AGE });
  }
}
