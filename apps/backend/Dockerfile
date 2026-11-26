# Multi-stage Dockerfile for Backend API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend

# Install all dependencies and build shared-types + backend
RUN npm install
RUN npm --workspace=packages/shared-types run build
RUN npm --workspace=apps/backend run build

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

EXPOSE 5000

CMD ["node", "dist/server.js"]
