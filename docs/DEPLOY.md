# Deploy — Neon + Render + Vercel (tudo em tier grátis)

Arquitetura em produção (três domínios diferentes, cookie cross-site):

```
Vercel (web, Next.js)  ──fetch com cookie──►  Render (api, NestJS)  ──►  Neon (Postgres)
```

Auth: cookie httpOnly `sameSite=none; secure` (cross-site), proteção de rota client-side via `/auth/me`.

> Pré-requisito: o código já precisa estar num repositório **GitHub** (as três plataformas fazem deploy a partir dele). Se ainda não subiu: crie um repo vazio no GitHub e `git remote add origin ... && git push -u origin main`.

---

## 1. Banco — Neon (grátis)

1. Crie conta em https://neon.tech e um projeto (região mais próxima, ex: AWS São Paulo `sa-east-1`).
2. No dashboard, em **Connection Details**, copie **duas** connection strings:
   - **Pooled** (o host tem `-pooler`) → será a `DATABASE_URL`.
   - **Direct** (sem `-pooler`) → será a `DIRECT_URL`.
   - Ambas terminam com `?sslmode=require`. Guarde as duas.

Não precisa rodar migration aqui — o container da API roda `prisma migrate deploy` sozinho no primeiro deploy.

---

## 2. API — Render (Web Service free)

1. Conta em https://render.com → **New → Web Service** → conecte o repo do GitHub.
2. Na configuração:
   - **Language / Runtime**: **Docker**
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Root Directory**: deixe **vazio** (raiz do repo — o Dockerfile builda a partir da raiz por causa do npm workspaces)
   - **Instance Type**: **Free**
   - **Health Check Path**: `/health`
3. Em **Environment Variables**, adicione:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string **pooled** do Neon |
   | `DIRECT_URL` | string **direct** do Neon |
   | `JWT_SECRET` | segredo forte — gere com `openssl rand -base64 32` |
   | `NODE_ENV` | `production` |
   | `WEB_ORIGIN` | URL do app na Vercel (preenche depois do passo 3) |
   - Não defina `PORT` — o Render injeta sozinho, e o `main.ts` já usa `process.env.PORT`.
4. **Create Web Service** → aguarde build + deploy. Copie a URL pública (ex: `https://devlog-api.onrender.com`). Essa é a **URL da API**.
5. Teste: abra `<URL da API>/health` → deve responder `{"status":"ok"}` (a primeira request pode demorar ~50s se o serviço estava dormindo).

> **Tier free do Render**: o serviço dorme após ~15 min sem tráfego e acorda em ~50s na requisição seguinte. Normal para uso pessoal.
>
> Ordem circular de env: `WEB_ORIGIN` (aqui) depende da URL da Vercel, e `NEXT_PUBLIC_API_URL` (Vercel) depende desta URL. Faça o passo 3, depois volte aqui e preencha `WEB_ORIGIN` — cada mudança de variável redeploya.

---

## 3. Web — Vercel

1. Conta em https://vercel.com → **Add New → Project** → importe o repo do GitHub.
2. Na configuração de import:
   - **Root Directory**: `apps/web` (a Vercel entende npm workspaces e instala a partir da raiz).
   - Framework: Next.js (detectado automaticamente).
3. **Environment Variables**:
   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | URL da API no Render (do passo 2.4) |
   - `NEXT_PUBLIC_*` é embutida no build — se mudar depois, precisa **redeploy**.
4. Deploy. Copie a URL do app (ex: `https://devlog.vercel.app`).
5. **Volte no Render** e preencha `WEB_ORIGIN` com essa URL exata (sem barra no final). Aguarde o redeploy da API.

---

## 4. Conferir

1. Acesse a URL da Vercel → deve cair no `/login`.
2. Crie conta / entre → cai na home.
3. Recarregue com F5 → continua logado (cookie cross-site funcionando).
4. Se o login "não gruda" (volta pro login após entrar): quase sempre é (a) `NODE_ENV` != `production` no Render → cookie não vira `secure`, ou (b) `WEB_ORIGIN` não bate exatamente com a URL da Vercel → CORS bloqueia o cookie. Confira as duas.

---

## Notas técnicas

- **Cookie cross-site**: web e api em domínios diferentes exigem `sameSite=none; secure`. O `secure` só sai sobre HTTPS e atrás do proxy da hospedagem graças ao `app.set('trust proxy', 1)` no `main.ts`. Tudo isso é ligado por `NODE_ENV=production`.
- **Sem middleware**: a proteção de rota é o `AuthGate` (client-side), porque o cookie mora no domínio da api e o middleware do Next (domínio da web) não o enxergaria.
- **Migrations**: o container roda `prisma migrate deploy` no start — aplica migrations versionadas, nunca gera/edita schema. Novas mudanças de schema: gere em dev (`npx prisma migrate dev`), comite, e o próximo deploy aplica.
- **Neon pooled vs direct**: runtime usa a pooled (aguenta muitas conexões curtas); migrations usam a direct (Prisma exige conexão direta para DDL). Daí os dois campos no `schema.prisma`.
- **Custos**: os três em tier grátis. Neon dorme o banco após inatividade (primeira query demora ~1s). Render dorme a API após 15 min (cold start ~50s). Se o cold start incomodar, alternativa é Fly.io (VM pequena sempre ligada no free) — mesmo Dockerfile, sem mudança de código.
