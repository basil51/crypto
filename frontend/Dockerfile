FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# Development stage
FROM base AS development
EXPOSE 3000
CMD ["pnpm", "dev"]

# Build stage
FROM base AS build
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

COPY --from=build /app/frontend/package.json ./
COPY --from=build /app/frontend/.next ./.next
COPY --from=build /app/frontend/public ./public
COPY --from=build /app/frontend/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "start"]

