# Dockerfile da API (NestJS + Prisma).
# IMPORTANTE: o build context é a RAIZ do monorepo (por causa do npm workspaces,
# onde package-lock.json e node_modules ficam na raiz). No Render:
#   Root Directory = (vazio, = raiz)   |   Dockerfile Path = apps/api/Dockerfile

# ---- build ----
FROM node:20-slim AS build
# openssl é exigido pelo Prisma engine em imagens slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

# Instala dependências de todos os workspaces a partir do lockfile da raiz
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

# Código da api + geração do Prisma Client + build
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace api
RUN npm run build --workspace api

# ---- runner ----
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
ENV NODE_ENV=production

# node_modules já traz o Prisma Client gerado (workspaces hoisted na raiz)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
# Render injeta PORT; o main.ts usa process.env.PORT.
# Aplica migrations pendentes e sobe. `migrate deploy` só aplica migrations já
# versionadas (nunca gera/edita schema) — seguro para produção.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
