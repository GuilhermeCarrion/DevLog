import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookies (JWT httpOnly) — precisa vir antes dos guards lerem req.cookies
  app.use(cookieParser());

  // Valida DTOs em todas as rotas; whitelist descarta campos não declarados
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // O front roda em outra origem (localhost:3000) e envia cookies
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
