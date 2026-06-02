FROM node:22-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY build.mjs tsconfig.json tsconfig.base.json ./
COPY src ./src

RUN npm install --prefer-offline --no-audit

RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]