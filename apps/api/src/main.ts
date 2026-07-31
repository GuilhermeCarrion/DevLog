import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Atrás do proxy da Railway/hosting: confia no X-Forwarded-Proto para que o
  // Express reconheça a request como https e envie o cookie `secure`.
  app.set('trust proxy', 1);

  // Cookies (JWT httpOnly) — precisa vir antes dos guards lerem req.cookies
  app.use(cookieParser());

  // Valida DTOs em todas as rotas; whitelist descarta campos não declarados
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // O front roda em outra origem e envia cookies (credentials).
  // Em produção, WEB_ORIGIN = URL do app na Vercel.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
