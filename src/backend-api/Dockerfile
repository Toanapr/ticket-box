FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY . .

WORKDIR /app/src/backend-api

RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm build

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma:migrate:deploy && pnpm db:seed:if-empty && node dist/src/main"]
