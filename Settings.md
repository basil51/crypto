# settings.md — Project Configuration & Development Rules

This file defines how Cursor, the development agents, and all developers must work on the project. It enforces architecture decisions, coding rules, integrations, and workflow standards.

---

# 1. Project Identity

**Name:** Crypto Accumulation Detection Platform
**Frontend:** Next.js 14 + TailwindCSS
**Backend:** NestJS (REST)
**Database:** PostgreSQL + Prisma
**Cache:** Redis
**Workers:** NestJS Scheduler Workers
**Hosting:** VPS (Docker + Traefik)

---

# 2. Source of Truth Files

Cursor must follow these files strictly:

1. `roadmap4.md` — Architecture, sprints, features.
2. `settings.md` — Rules, coding standards, API contracts.
3. `status.md` — Progress tracking + completed tasks.

DO NOT deviate without explicit instruction.

---

# 3. Data Provider Rules (Final)

Bitquery is **forbidden** in the project. No references. No queries.

Allowed providers:

* **Covalent** → primary transfers/logs provider.
* **The Graph** → DEX events (swaps, LP changes).
* **QuickNode** → Solana RPC + streaming.
* **Moralis + Alchemy** → EVM transactions + metadata.
* **CoinGecko** → Price.

Any new integration must:

* Have a module inside `integrations/`
* Log cost in `api_usage_log`
* Implement retry logic
* Cache responses when possible

---

# 4. Backend Architecture Rules

* Every provider gets its own module in `/integrations`.
* Every worker must be registered under `/jobs`.
* All ingestion must be normalized before saving.
* Prisma must be the only DB interface.
* All endpoints must follow: `/api/:module/:action`.

### Required Modules

* auth
* users
* tokens
* transactions
* signals
* alerts
* integrations
* jobs

### Required Workers

* ingestion worker
* detection worker
* alert dispatcher worker

---

# 5. Detection Engine Rules

The scoring system must follow the 7-rule model:

1. Large Transfers — Covalent
2. Whale Clusters — Covalent
3. Exchange Flows — Covalent + scan APIs
4. Holding Pattern Increase — existing
5. Volume Spike — existing
6. Liquidity Pool Increases — The Graph
7. Repeated Large Swaps — The Graph

Min score for signal: **60**
Min score for alert: **75**

---

# 6. Frontend Requirements

### Pages (must exist)

* `/` → dashboard
* `/whales` → whale activity (Covalent)
* `/sell-walls` → orderbook analysis
* `/token/[symbol]` → intelligence page
* `/alerts` → user alerts
* `/auth/login`, `/auth/register`

### Design

* TailwindCSS
* Light + dark mode
* Responsive
* Server-side data fetching where needed

---

# 7. Redis Usage Rules

Redis must be used for:

* API caching
* Orderbook snapshots
* Rate limiting
* Hot signal caching

---

# 8. Docker & Deployment Rules

All services must run under Docker:

* backend
* frontend
* postgres
* redis
* traefik

Production deployment must:

* use HTTPS
* mount persistent volumes
* load `.env.production`

---

# 9. Cursor Automation Rules

Cursor must:

* Generate code based only on roadmap4.md.
* Update status.md when tasks are completed.
* Use NestJS decorators & Prisma syntax.
* Create PRs with clear commit messages.

Cursor must NOT:

* Reintroduce Bitquery
* Change architecture
* Create alternative stacks

---

# 10. Development Workflow

1. Developer assigns themselves a sprint task.
2. Cursor generates required code.
3. Developer tests locally with Docker.
4. Developer updates `status.md`.
5. Create PR → merge → deploy.

---

# 11. Environment Variables Template

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
COVALENT_API_KEY=
ALCHEMY_API_KEY=
MORALIS_API_KEY=
QUICKNODE_API_URL=
SENDGRID_KEY=
TELEGRAM_BOT_TOKEN=
```

---

# 12. Final Notes

This file must be followed strictly by Cursor and all developers. Any future change must be explicitly approved by Basel.
