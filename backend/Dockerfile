FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend/ ./backend/

WORKDIR /app/backend

# Build stage
FROM base AS build
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./
COPY --from=build /app/backend/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main.js"]

