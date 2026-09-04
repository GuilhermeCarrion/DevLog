# DevLog

[![CI](https://github.com/GuilhermeCarrion/DevLog/actions/workflows/ci.yml/badge.svg)](https://github.com/GuilhermeCarrion/DevLog/actions/workflows/ci.yml)

Sistema pessoal para registrar planejamentos, tasks, sessões de trabalho, notas e agenda por projeto — e gerar o relatório semanal da faculdade (fase 2).

**Stack:** NestJS + Prisma + PostgreSQL · Next.js + Tailwind v4 · JWT em cookie httpOnly

- Especificação do MVP: [DevLog-MVP-Especificacao.md](./DevLog-MVP-Especificacao.md)
- Documentação técnica das soluções: [docs/SOLUCOES.md](./docs/SOLUCOES.md)
- Passo-a-passo de deploy (Vercel + Railway + Neon): [docs/DEPLOY.md](./docs/DEPLOY.md)

## Rodando

Pré-requisitos: Node 20+, Docker.

```bash
# 1. dependências (raiz — instala api e web)
npm install

# 2. banco (Postgres 16 em docker)
npm run db:up

# 3. migrations (primeira vez ou após mudar o schema)
npm run db:migrate

# 4. em dois terminais:
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:3000
```

Acesse http://localhost:3000, crie sua conta e comece.

O `.env` da API fica em `apps/api/.env` (veja `apps/api/.env.example`).

## Testes e CI

```bash
npm test --workspace web     # unitários do front (Vitest) — cálculo, formatação, status de sessão
npm test --workspace api     # unitários da API (Jest) — agregação do resumo (Prisma mockado)
npm run test:e2e --workspace api   # e2e da API (sobe o app; exige Postgres — use npm run db:up)
```

O pipeline de CI ([.github/workflows/ci.yml](./.github/workflows/ci.yml)) roda a cada push/PR: instala dependências, executa os testes (unitários + e2e com um Postgres de serviço) e faz o build da API e do web. O status aparece no badge acima.

## Estrutura

```
apps/
  api/   NestJS — auth, projects, groups, tasks, sessions, notes, agenda
  web/   Next.js — telas, tema dark/lima, React Query
docs/
  SOLUCOES.md   cada solução implementada, com conceitos e regras
```
