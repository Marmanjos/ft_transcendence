FROM node:22-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY build.mjs tsconfig.json tsconfig.base.json ./
COPY src ./src

RUN npm ci

RUN npm run build

FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]