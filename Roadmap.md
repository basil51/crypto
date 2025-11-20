# ROADMAP — Detailed Technical Roadmap for Crypto Accumulation Detection Platform

> **Purpose:** This document is the definitive, developer-friendly, step-by-step technical roadmap for building a SaaS platform that detects accumulation/whale activity on crypto blockchains and sends early alerts. The roadmap is written in **English** so it can be used directly in code, comments, issue trackers, and Cursor.com workflows. The stack: **Next.js + Tailwind (frontend)**, **NestJS (backend)**, **PostgreSQL**, optional **Python** components for advanced analytics. The recommended workflow is **Backend-first → Frontend**.

---

## Table of Contents

1. Project Summary
2. Development Strategy & Timeline
3. High-Level Architecture
4. Database Schema (PostgreSQL)
5. Backend (NestJS) Design
6. Frontend (Next.js + Tailwind) Design
7. External Data Integrations (APIs)
8. Accumulation Detection Logic (Algorithms)
9. Alerting System (Delivery Channels)
10. Caching, Rate Limits, and Cost Control
11. Authentication, Authorization & Security
12. Testing Strategy & QA
13. CI/CD, Monitoring & Deployment
14. Cursor.com Integration — How to use this roadmap as the source-of-truth
15. Sprint-by-Sprint Implementation Plan (Epics & Tasks)
16. Appendix: Example Endpoints, SQL, and Worker Scripts

---

## 1. Project Summary

**Goal:** Build a reliable, low-latency system that detects signs of accumulation (collection) for tokens across supported chains and delivers early, actionable alerts to subscribers.

**MVP feature set:**

* Token listing and metadata (name, symbol, contract, chain)
* Backend pipelines that ingest on-chain events and wallet transactions
* Basic accumulation detection engine (rules-based)
* Dashboard showing detected signals and recent whale movements
* Alert delivery via Telegram and Email
* Free tier + paid tiers with throttling

**Non-functional goals:** scalable, fault-tolerant, maintainable code, cost-aware.

---

## 2. Development Strategy & Timeline

**Strategy:** Backend-first. Build stable APIs and worker processes to detect signals and store them. Then build frontend consuming well-documented APIs. Use mocks early where necessary.

**Estimated timeline (developer working full-time):**

* Environment & repo setup: 1–2 days
* Backend MVP: 10–15 days
* Worker & detection pipelines: 7–10 days
* Frontend MVP: 8–12 days
* Integrations, caching, security: 5–10 days
* Beta testing and improvements: 10–20 days

**Total (MVP to Beta):** ~6–10 weeks

---

## 3. High-Level Architecture

**Components:**

* Frontend: Next.js (React) + Tailwind CSS
* Backend API: NestJS (TypeScript) REST API (optionally GraphQL later)
* DB: PostgreSQL (primary store)
* Cache & queue: Redis (caching + lightweight job queue)
* Worker processes: NestJS workers (or Python workers) to process ingestion & detection
* Message broker (optional): RabbitMQ if high throughput needed
* External connectors: Moralis / Alchemy / Covalent / TheGraph / CoinGecko
* Notification services: Telegram Bot API, SendGrid/Mailgun for email
* Hosting: VPS (Contabo/DO) or cloud (AWS/GCP) + Docker Compose / Docker Swarm / Kubernetes later
* Observability: Sentry, Prometheus / Grafana

**Data flow:**

1. External provider pushes or backend polls for new transactions / balances.
2. Ingest transactions into DB and optionally push to Redis queue.
3. Workers consume queue, update wallet positions and compute detection windows.
4. When score passes threshold → create accumulation_signal record → generate alerts.
5. Frontend reads signals via API and displays dashboard.

---

## 4. Database Schema (PostgreSQL)

Use `uuid` primary keys. Use `JSONB` for flexible fields.

**Core tables (initial):**

1. `users`:

* id (uuid PK)
* email
* password_hash
* role (admin/user)
* plan (free/pro)
* created_at, updated_at

2. `tokens`:

* id
* chain (e.g., ethereum, bsc)
* symbol
* name
* contract_address
* decimals
* metadata (jsonb)
* active boolean
* created_at

3. `wallets`:

* id
* address
* label
* tracked boolean
* created_at

4. `wallet_positions` (materialized snapshots per window):

* id
* wallet_id
* token_id
* balance (numeric)
* last_updated_at

5. `transactions`:

* id
* tx_hash
* from_address
* to_address
* token_id
* amount (numeric)
* block_number
* timestamp
* raw (jsonb)

6. `accumulation_signals`:

* id
* token_id
* score (numeric)
* signal_type (e.g., whale_inflow, exchange_outflow, lp_increase)
* window_start, window_end
* wallets_involved (jsonb array)
* metadata (jsonb)
* created_at

7. `alerts`:

* id
* user_id
* signal_id
* channels (jsonb: {telegram: true, email: false})
* delivered_at
* status

8. `api_usage_log`:

* id
* provider
* endpoint
* cost_estimate
* timestamp

**Indexes and optimizations:**

* Index on `transactions(token_id, timestamp)`
* Index on `wallet_positions(wallet_id, token_id)`
* Partial index for `accumulation_signals(signal_type, created_at)`

---

## 5. Backend (NestJS) Design

### 5.1 Project structure (recommended)

```
backend/
  src/
    modules/
      auth/
      users/
      tokens/
      wallets/
      transactions/
      signals/
      alerts/
      integrations/
      jobs/
    common/
    main.ts
  test/
  Dockerfile
  docker-compose.yml
```

### 5.2 Key modules & responsibilities

* `integrations`: connectors to Moralis/Alchemy/Covalent; handles polling & webhook receivers
* `transactions`: ingest & normalize transaction data
* `wallets`: track wallets and compute aggregated balances
* `signals`: run detection rules and produce `accumulation_signals`
* `alerts`: subscribe/deliver alerts
* `jobs`: scheduled cron jobs and worker process orchestration

### 5.3 Important design decisions

* Use REST for MVP (`/api/*`), expose OpenAPI (Swagger). Later add GraphQL if needed.
* Worker processes separate from HTTP app: `node dist/main.js --worker` to run background tasks
* Use TypeORM or Prisma (Prisma recommended for DX) for DB access. Prisma with PostgreSQL is great.

### 5.4 Example API endpoints

* POST `/api/auth/login`
* POST `/api/auth/register`
* GET `/api/tokens` (filters: active, chain)
* GET `/api/tokens/:id`
* GET `/api/signals` (filters: time_range, signal_type, min_score)
* POST `/api/alerts/subscribe` (user subscribes to token alerts)
* GET `/api/users/me/alerts`

### 5.5 Background workers

* **Ingest worker:** polls external API providers for transactions / balance deltas and writes normalized transactions.
* **Position updater:** computes wallet positions per token (snapshotting)
* **Detection worker:** runs rule sets across windows and writes `accumulation_signals`.
* **Alert dispatcher:** listens for new signals and delivers messages to subscribed users.

---

## 6. Frontend (Next.js + Tailwind) Design

### 6.1 Project structure (recommended)

```
frontend/
  app/  (Next.js 13+ app dir)
    layout.tsx
    page.tsx (dashboard)
    tokens/
    signals/
    settings/
  components/
  hooks/
  styles/
  public/
  next.config.js
```

### 6.2 Pages & components (MVP)

* **Dashboard:** recent signals, trending tokens, quick filters
* **Token page:** token metadata, recent wallet moves, liquidity events
* **Signal page:** details for each accumulation signal, list of wallets involved
* **Alerts settings:** subscribe/unsubscribe, channels (Telegram, Email)
* **Auth pages:** login / register / forgot password

### 6.3 UX details

* Use skeleton loaders while data loads
* Pagination & server-side fetching for heavy lists
* Responsive design (mobile-first)

### 6.4 Integration with Cursor

* Use Cursor to generate component templates and automated PRs based on this roadmap.
* Ensure Cursor actions are pinned to the repo and map to tasks in the Sprint plan.

---

## 7. External Data Integrations (APIs)

**Providers & use-cases:**

* **Moralis / Alchemy / QuickNode:** transaction logs, token transfers, logs, mempool (if available)
* **Covalent:** token balances, historical token transfers across chains
* **CoinGecko / CoinMarketCap:** price and market data
* **TheGraph (where available):** DEX liquidity events and LP changes

**Integration patterns:**

* **Polling:** use intervals to fetch new blocks/transactions (good for ease of implementation)
* **Webhooks/Streams:** use provider webhooks if available to get near real-time events
* **Hybrid:** poll for missing data + webhooks for real-time

**API cost control:**

* Cache responses in Redis for N minutes
* Only fetch detailed data for tracked tokens (top N or those with signals)
* Batch requests where provider supports it

---

## 8. Accumulation Detection Logic (Algorithms)

Start with rule-based heuristics. Later add statistical or ML models (Python) once you have historical data.

**Core heuristics (examples):**

1. **Exchange Outflow Spike:** sudden net outflow from centralized exchanges for a token in a short window → accumulation
2. **Concentrated Buys:** multiple large buys by wallets that are not exchanges within timeframe T
3. **New Whale Addresses:** a cluster of new addresses receiving token transfers from known large wallets
4. **Liquidity Pool Increases:** sustained LP addition on AMMs with slippage-resistant buys
5. **Holding Patterns:** wallets increasing balance over time while supply on exchanges decreases

**Scoring model:** assign weighted points per rule and compute a normalized `score` (0–100). Thresholds:

* score >= 60: notify internal monitoring (candidate)
* score >= 75: trigger public alert

**Data windows:** compute metrics over multiple sliding windows: 5m, 1h, 6h, 24h, 7d

**False-positive control:** require multiple signals (e.g., outflow + whale buys) or repeated detection across windows before a public alert.

**Advanced:** use Python to run anomaly detection (isolation forest) on features like exchange_balance_delta, avg_buy_size, wallet_count_growth.

---

## 9. Alerting System (Delivery Channels)

**Channels:** Telegram Bot, Email (SendGrid/Mailgun), Webhooks (for enterprise), In-app notifications.

**Alert flow:**

1. Detection worker emits `accumulation_signals`
2. Alert dispatcher checks subscriptions & rate limits
3. Compose message (short text + link to dashboard + JSON payload for webhook)
4. Send via channel and log delivery

**Message templates:** Maintain localized templates (English first). Include: token name, chain, score, short reason, involved wallets count, link.

**Rate limiting & deduplication:**

* Track last alert per token per user (cooldown window)
* Queue and batch alerts during spikes

---

## 10. Caching, Rate Limits, and Cost Control

**Caching strategy:**

* Redis for caching API responses (prices, token metadata)
* Short TTLs for price (10s–60s), longer for metadata (24h)

**Rate limiting:**

* API layer: per-user rate limits for dashboard and search
* Outbound API usage: global limiter to avoid hitting provider quotas

**Cost control:**

* Track `api_usage_log` records and estimate cost
* Only fetch deep data for tokens that are: tracked, trending, or have candidate signals

---

## 11. Authentication, Authorization & Security

**Auth:** JWT + Refresh Token stored in httpOnly cookies.
**Password:** bcrypt hashing
**Roles:** admin, user, trial
**Security measures:**

* Use HTTPS everywhere
* Input validation on all endpoints
* Rate limiting, account lockout on brute force
* Secrets management via environment variables or secrets manager

**GDPR / Privacy:** avoid storing unnecessary personal data; store minimal email + preferences.

---

## 12. Testing Strategy & QA

**Unit tests:** Jest for backend, vitest or jest for frontend
**Integration tests:** supertest for endpoints
**E2E tests:** Playwright (covers login, subscription flow, alert receipt)
**Load testing:** k6 or Artillery for API endpoints

---

## 13. CI/CD, Monitoring & Deployment

**CI:** GitHub Actions for lint, test, build, and push images
**CD:** Docker Compose for VPS; GitHub Actions deploy to server via SSH + docker-compose pull & restart
**Production infra:**

* Dockerized services: backend, frontend, postgres, redis, worker
* Use Traefik for routing & HTTPS (if on VPS)

**Monitoring:**

* Sentry for errors, Prometheus for metrics, Grafana for dashboards

---

## 14. Cursor.com Integration — How to use this roadmap

**Setup:** commit this `ROADMAP_EN.md` to the repo. In Cursor, create tasks matching sprints and assign Cursor AI prompts referencing the exact file path.

**How Cursor will help:**

* generate code stubs for endpoints
* scaffold components in Next.js using this spec
* create unit tests and PRs according to tasks

**Enforce plan:** in every Cursor prompt include: “Follow `ROADMAP_EN.md` strictly. Do not deviate from the stack: Next.js, Tailwind, NestJS, PostgreSQL. Use REST endpoints listed in the appendix.”

---

## 15. Sprint-by-Sprint Implementation Plan (Concrete Tasks)

**Sprint 0 — Setup (2 days)**

* Initialize monorepo or two repos (`frontend`, `backend`)
* Setup GitHub Actions skeleton
* Create base Docker Compose with Postgres + Redis
* Add basic README and ROADMAP_EN.md

**Sprint 1 — Backend Core (10–15 days)**

* Scaffold NestJS app + modules
* Setup Prisma + PostgreSQL schema (migrate)
* Implement auth (register, login)
* Implement tokens and transactions models + endpoints
* Implement integrations module with Moralis/Alchemy connector (polling)
* Implement ingest worker to store transactions

**Sprint 2 — Detection & Workers (7–10 days)**

* Implement wallet_positions updater
* Implement detection worker (rule engine) + scoring
* Implement accumulation_signals model and endpoints
* Implement alert dispatcher skeleton (logs only)

**Sprint 3 — Frontend MVP (8–12 days)**

* Scaffold Next.js app, Tailwind setup
* Implement Dashboard (list signals)
* Token detail pages
* Alerts settings page
* Auth flows (login/register)

**Sprint 4 — Integrations & Hardening (7–10 days)**

* Add Telegram & Email integrations
* Add caching & rate limiting
* Add API usage logging & cost estimates
* Add basic tests & CI

**Sprint 5 — Beta & Launch (7–14 days)**

* Invite beta users
* Fix bugs, tune thresholds
* Add subscription billing (Stripe)
* Prepare deployment and monitoring

---

## 16. Appendix (Examples)

**Example detection rule (pseudocode):**

```
if exchange_outflow(token, last_1h) > threshold_outflow and
   whale_buy_volume(token, last_1h) > threshold_whale_volume:
    score = normalize(outflow, buy_volume, wallet_count)
    if score > 75:
       create accumulation_signal(token, score, details)
```

**Example API endpoint (GET /api/signals):**

```
GET /api/signals?chain=ethereum&min_score=70&from=2025-11-01
Response: { signals: [ {id, token_id, score, signal_type, created_at, metadata} ] }
```

**Prisma schema tip:**

* Use `Decimal` for token amounts (with scale)
* Use `Json` for raw provider payloads

---

## Final Notes & Next Steps

* I will remain your technical project manager and guide inside Cursor.com and the repo.
* Next immediate step: *I will commit this ROADMAP_EN.md to the repo and create the Sprint 0 tasks in Cursor.*
* Tell me if you want me to also generate the initial repo scaffolding (NestJS + Next.js + Docker Compose) and open PRs in Cursor — I can create code stubs and CI config according to this roadmap.

**Choose the next action:**

* `Create repo scaffolding now`
* `Generate Prisma schema + initial migrations`
* `Scaffold NestJS modules + example endpoints`
* `Scaffold Next.js pages + components`

Pick one or more and I’ll start immediately, following this roadmap strictly.
