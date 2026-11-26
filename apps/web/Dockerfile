# Multi-stage Dockerfile for Web Dashboard (Staff & Admin)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

RUN npm install
RUN npm --workspace=packages/shared-types run build
RUN npm --workspace=apps/web run build

# Production Nginx Server
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
