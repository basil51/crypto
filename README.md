# Crypto Accumulation Detection Platform

A SaaS platform that detects accumulation/whale activity on crypto blockchains and sends early alerts.

## Tech Stack

- **Frontend**: Next.js 16 + Tailwind CSS + TypeScript
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Package Manager**: pnpm
- **Containerization**: Docker & Docker Compose

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.15.0 or higher)
- Docker & Docker Compose (optional, for database services)
- **API Keys**: See [required_keys.md](required_keys.md) for required API keys and setup instructions

### Installation

Install dependencies for all workspaces:

```bash
pnpm install
```

### Development

Run both frontend and backend concurrently:

```bash
pnpm dev
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:3001

### Individual Commands

Run frontend only:
```bash
pnpm dev:frontend
```

Run backend only:
```bash
pnpm dev:backend
```

### Docker Setup (Database Services)

Start PostgreSQL and Redis using Docker Compose:

```bash
# Start only database services (recommended for local dev)
# Uses ports 5433 (PostgreSQL) and 6380 (Redis) to avoid conflicts
docker-compose -f docker-compose.dev.yml up -d

# Or start all services (frontend, backend, postgres, redis)
# Note: This uses standard ports 5432 and 6379 - stop local services first if needed
docker-compose up -d
```

**Port Configuration:**
- `docker-compose.dev.yml`: Uses ports **5433** (PostgreSQL) and **6380** (Redis) to avoid conflicts with local services
- `docker-compose.yml`: Uses standard ports **5432** (PostgreSQL) and **6379** (Redis)

Stop services:
```bash
docker-compose -f docker-compose.dev.yml down
# or
docker-compose down
```

### Environment Variables

Create a `.env` file in the root directory (see `.env.example` for reference):

```env
# Database
DATABASE_URL=postgresql://crypto_user:crypto_password@localhost:5432/crypto_db

# Redis
REDIS_URL=redis://localhost:6379

# Backend
BACKEND_PORT=3001
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Project Structure

```
crypto/
├── frontend/              # Next.js application
├── backend/               # NestJS API
├── .github/workflows/     # GitHub Actions CI/CD
├── docker-compose.yml     # Full stack Docker setup
├── docker-compose.dev.yml # Database services only
├── Roadmap.md             # Detailed technical roadmap
├── STATUS.md              # Real-time progress tracking
└── package.json           # Root workspace configuration
```

## Next Steps

- Refer to `Roadmap.md` for the detailed implementation plan and sprint breakdown
- Check `STATUS.md` for current progress and completed tasks
- **Current Status:** Sprint 0 Complete → Ready for Sprint 1 (Backend Core)

