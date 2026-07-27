import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  // Health check público — útil para saber se a API está de pé
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'devlog-api' };
  }
}
