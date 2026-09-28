# ============================================================================
# Dockerfile da API (NestJS + Prisma + gerador de relatório em Python).
#
# IMPORTANTE: o build context é a RAIZ do monorepo (npm workspaces mantêm
# package-lock.json e node_modules hoisted na raiz). Ex.:
#   docker build -f apps/api/Dockerfile -t devlog-api .
#
# Imagem multi-stage com 3 estágios:
#   1) build      → instala TUDO (dev incluso) e compila o TypeScript
#   2) prod-deps  → instala SÓ dependências de runtime (sem devDependencies)
#   3) runner     → imagem final enxuta: só o compilado + deps de produção
# ============================================================================

# ---------------------------------------------------------------------------
# 1) BUILD — tem as ferramentas de build (Nest CLI, TypeScript, Prisma CLI).
#    Nada daqui vai para a imagem final além do `dist/` compilado.
# ---------------------------------------------------------------------------
FROM node:20-slim AS build
# openssl é exigido pelos engines do Prisma nas imagens slim (Debian).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copia só os manifests ANTES do código: enquanto as dependências não mudam,
# esta camada (e o `npm ci`) fica em cache — builds ficam muito mais rápidos.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

# Agora sim o código, o Prisma Client e o build do Nest.
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace api \
  && npm run build --workspace api

# ---------------------------------------------------------------------------
# 2) PROD-DEPS — node_modules APENAS de produção (--omit=dev).
#    Aqui é onde a imagem emagrece: fora TypeScript, ESLint, Jest, Nest CLI,
#    @types/*, etc. Fica só o necessário para rodar.
# ---------------------------------------------------------------------------
FROM node:20-slim AS prod-deps
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
# --omit=dev não instala devDependencies. `prisma` (CLI) é dependência de
# produção de propósito: o container roda `prisma migrate deploy` no start.
RUN npm ci --omit=dev

# Gera o Prisma Client dentro deste node_modules de produção.
COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

# ---------------------------------------------------------------------------
# 3) RUNNER — imagem final. Só runtime: Node + deps de produção + dist.
# ---------------------------------------------------------------------------
FROM node:20-slim AS runner
# openssl: engine do Prisma | python3 + venv: gera o relatório (.docx via docxtpl)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

# node_modules de produção (com o Prisma Client já gerado) — vindo do prod-deps.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Manifests (o npm/prisma resolvem o workspace por eles).
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
# Somente o resultado do build + schema/migrations + scripts do relatório.
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/report ./apps/api/report

# Roda como usuário sem privilégios (o node:20 já traz o usuário `node`).
USER node

# venv Linux isolado com docxtpl — o ReportsService usa report/.venv/bin/python
# fora do Windows. `--no-cache-dir` evita deixar cache do pip na camada.
RUN python3 -m venv /app/apps/api/report/.venv \
  && /app/apps/api/report/.venv/bin/pip install --no-cache-dir \
  -r /app/apps/api/report/requirements.txt

WORKDIR /app/apps/api
# A API lê PORT do ambiente (default 3001).
EXPOSE 3001
# Aplica migrations versionadas e sobe. `migrate deploy` NUNCA gera/edita schema
# (só aplica o que já está versionado) — seguro para produção.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
