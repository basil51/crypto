# Roadmap 2.0 — Extended Features & New Pages

This roadmap continues directly after Roadmap 1.0 (MVP core), focusing on advanced features, new pages, analytics enhancements, and expanded data sources.

---

## 🧭 Scope of Roadmap 2.0

Roadmap 2.0 includes:

* New dashboard pages
* Advanced analytics features (whales, sell walls, accumulation)
* Expanded API integrations (Bitquery, Etherscan/BscScan, The Graph)
* Orderbook-based detectors
* UI/UX upgrades suitable for professional traders
* Subscription-ready components

---

# 1. New Pages (Frontend)

## 1.1 **Whale Activity Page**

### Purpose

A dedicated page for on-chain & CEX whale insights.

### Features

* Whale accumulation heatmap
* Large transfers (in/out exchanges)
* Whale clusters buying the same token
* Token-level whale score
* Time-based charts (5m, 15m, 1h, 24h)

### Tasks

* New Next.js page: `/whales`
* Components: charts, tables, signals list, token panel
* API integration from backend

---

## 1.2 **Sell Walls & Orderbook Pressure Page**

### Purpose

Show CEX orderbook signals that influence price movement.

### Features

* Detect sell walls (Binance, KuCoin)
* Show orderbook snapshots
* Sell wall history (timeline)
* Alerts for wall creation & removal
* Orderbook heatmap visualization

### Tasks

* New page: `/sell-walls`
* Chart components (heatmap, stacked bars)
* API endpoint integration

---

## 1.3 **Token Intelligence Page** (Deep Dive)

### Purpose

A page for advanced traders to analyze a single token deeply.

### Features

* Price, volume, liquidity overview
* Whale activity panel
* Sell walls around current price
* Token holders change (Etherscan/BscScan)
* Smart Money score
* Accumulation timeline

### Tasks

* Dynamic route page: `/token/[symbol]`
* Multiple backend queries
* Real-time data components

---

## 1.4 **Watchlists & Alerts Page**

### Purpose

Personalized dashboard for subscribers.

### Features

* User watchlists
* Custom alerts (price, volume, whales, sell walls)
* Alert preferences per user
* Trigger history

### Tasks

* Next.js page: `/alerts`
* Forms and configuration panel
* Hook into backend alerts system

---

# 2. Backend Enhancements (NestJS)

## 2.1 **Orderbook Module**

### Purpose

Fetch depth data from Binance & KuCoin for analysis.

### Tasks

* WebSocket connection manager
* Redis caching
* Depth snapshot storage
* Expose API: `/orderbook/:symbol`

---

## 2.2 **Sell Wall Detector (Worker)**

### Purpose

Detect large sell orders or walls.

### Tasks

* Read orderbook from Redis
* Compare asks volume vs thresholds
* Save entries in `SellOffer` table
* Emit alerts

---

## 2.3 **Whale Activity Module**

### Purpose

Aggregate on-chain data from Bitquery, Etherscan/BscScan.

### Tasks

* Monitor deposits/withdrawals to exchanges
* Detect whale clusters
* Classify wallets by type
* Expose API endpoints:

  * `/whales/top-buyers`
  * `/whales/exchange-flows`
  * `/whales/token/:symbol`

---

## 2.4 **DEX Analytics via The Graph**

### Purpose

Analyze DEX swaps for accumulation and dumps.

### Tasks

* Query Uniswap/PancakeSwap pools
* Detect liquidity increases/decreases
* Detect large swaps
* Create DEX-event pipeline

---

# 3. Database (Prisma) Additions

## 3.1 **New Models**

* `SellOffer`
* `WhaleEvent`
* `ExchangeFlow`
* `DexSwapEvent`
* `TokenMetrics`
* `Alert`

## 3.2 **Migrations**

Create tables and relations for advanced analytics.

---

# 4. API Integrations

## 4.1 Exchange Orderbook APIs

* Binance depth stream
* KuCoin depth stream
* Optional: Bybit, OKX

## 4.2 On-Chain Providers

* Bitquery (high priority)
* Etherscan/BscScan API
* The Graph decentralized indexers

## 4.3 Public Market Data

* Continue using CoinGecko
* Add trending coins, top gainers, most-viewed

---

# 5. Alerts System (Backend Workers)

## Types of Alerts

* Whale buy
* Whale sell
* Exchange deposit
* Exchange withdrawal
* Sell wall created
* Sell wall removed
* Token breakout (volume/pump)

## Delivery Options

* In-app
* Email
* Telegram bot (later)

---

# 6. Subscriptions (Stripe Integration)

## Tasks

* Stripe setup (test → production)
* Paid tiers (Basic / Pro / Whale Hunter)
* Access permissions in backend
* Subscribed-user dashboard sections

---

# 7. UI/UX Improvements

* Professional trader theme
* Live components
* WebSocket data sync
* Token search improvements
* Skeleton loaders for real-time pages

---

# 8. Performance & Scaling

* Redis caching for all hot data
* API rate limiting per user tier
* Queue-based workers for heavy tasks
* Load tests

---

# 9. Security

* API key rotation
* User auth hardening
* Secrets via environment encryption
* Webhook verification (Stripe)

---

# 10. Release Plan

## Phase 1 — Core new pages

* Whale Activity
* Sell Walls
* Token Intelligence

## Phase 2 — Advanced analytics

* On-chain + DEX integration
* Accumulation scoring

## Phase 3 — Alerts + subscriptions

* Custom alerts per user
* Subscription gating

## Phase 4 — Pro trader tools

* Custom dashboards
* Deep whale cluster analytics

---

# END OF ROADMAP 2.0
