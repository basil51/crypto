# Crypto Accumulation Detection Platform

A SaaS platform that detects accumulation/whale activity on crypto blockchains and sends early alerts.

## Tech Stack

- **Frontend**: Next.js 16 + Tailwind CSS + TypeScript
- **Backend**: NestJS + TypeScript
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.15.0 or higher)

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

## Project Structure

```
crypto/
├── frontend/          # Next.js application
├── backend/           # NestJS API
├── Roadmap.md         # Detailed technical roadmap
└── package.json       # Root workspace configuration
```

## Next Steps

Refer to `Roadmap.md` for the detailed implementation plan and sprint breakdown.

