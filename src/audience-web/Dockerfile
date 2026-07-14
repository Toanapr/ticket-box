FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

ARG BACKEND_API_BASE_URL=http://backend-api:3000
ENV BACKEND_API_BASE_URL=${BACKEND_API_BASE_URL}

COPY . .

WORKDIR /app/src/audience-web

RUN npm install --no-audit --no-fund
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npm run start -- --port ${PORT:-3000}"]
