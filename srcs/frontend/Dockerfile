FROM node:22-bookworm As builder

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

RUN npm ci --prefer-offline --no-audit

COPY . .

RUN npm build

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    nginx curl && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

RUN mkdir -p /var/run/nginx

CMD ["nginx", "-g", "daemon off;"]