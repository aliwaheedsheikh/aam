# D-1: Multi-stage Dockerfile for VenueOps NestJS backend.
# Stage 1 — Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npx prisma generate

# Stage 2 — Production runner (slim image, no devDependencies)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

# D-3: Run prisma migrate deploy before starting the server so schema
# migrations are always applied atomically on every container start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
