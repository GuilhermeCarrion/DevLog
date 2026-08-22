import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health é público e responde ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'devlog-api' });
  });

  // Rotas novas nascem protegidas pelo guard global (sem cookie → 401)
  it('GET /summary exige autenticação', () => {
    return request(app.getHttpServer()).get('/summary').expect(401);
  });

  it('POST /projects/:id/reports/generate exige autenticação', () => {
    return request(app.getHttpServer())
      .post('/projects/qualquer/reports/generate')
      .send({ from: '2026-08-01', to: '2026-08-20' })
      .expect(401);
  });

  it('PUT /projects/:id/report-profile exige autenticação', () => {
    return request(app.getHttpServer())
      .put('/projects/qualquer/report-profile')
      .send({})
      .expect(401);
  });
});
