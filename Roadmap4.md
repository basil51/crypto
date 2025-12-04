# Roadmap 4.0 — Crypto Accumulation Detection Platform (No Bitquery)

This roadmap replaces all Bitquery integrations and introduces a new architecture using Covalent, The Graph, QuickNode, Moralis, and Alchemy. It merges Roadmap1, Roadmap2, Roadmap3, and the latest project status into one final, unified roadmap used by Cursor as the source-of-truth.

---

## 1. Data Provider Strategy (Final)

### Removed

* Bitquery (Permanently removed due to cost and instability)

### Added

* **Covalent** → Main provider for large transfers, logs, whale events across chains.
* **The Graph** → DEX swaps, LP changes, liquidity analytics.
* **QuickNode** → Solana RPC + streaming.
* **Moralis + Alchemy** → Continue as core providers for EVM transactions and metadata.
* **CoinGecko** → Price markets.

---

## 2. Updated Backend Architecture ✅ IMPLEMENTED

### 2.1 Integrations ✅

* ✅ `/integrations/covalent` → unified REST client + cost tracking (CovalentService)
* ✅ `/integrations/thegraph` → GraphQL client for Uniswap/PancakeSwap (TheGraphService)
* ✅ `/integrations/quicknode` → Solana RPC + streaming client (QuickNodeService)
* ✅ `/integrations/moralis`, `/integrations/alchemy` remain as is

### 2.2 Workers ✅

* ✅ Ingestion Worker updated to:

  * ✅ Pull large transfers via Covalent (every 15 min)
  * ✅ Pull EVM transactions via Moralis/Alchemy (every 5 min)
  * ✅ Pull Solana transactions via QuickNode (every 10 min)
  * ✅ Pull DEX swaps via The Graph (every 20 min)
  * ✅ Pull LP changes via The Graph (every 30 min)

* ✅ Detection Worker updated with all 7 rules:

  * ✅ Rule 1: Large Transfers (Covalent)
  * ✅ Rule 2: Whale Clusters (Covalent)
  * ✅ Rule 3: Exchange Flows (Covalent + Scan APIs)
  * ✅ Rule 4: Holding Pattern (existing)
  * ✅ Rule 5: Volume Spike (existing)
  * ✅ Rule 6: DEX Liquidity Increase (The Graph)
  * ✅ Rule 7: Repeated Large Swaps (The Graph)

---

## 3. New Database Models ✅ IMPLEMENTED

New tables added to Prisma schema:

* ✅ `WhaleEvent` - Being populated by Covalent (whale event ingestion)
* ✅ `DexSwapEvent` - Being populated by The Graph (DEX swap ingestion)
* ✅ `LpChangeEvent` - Being populated by The Graph (LP change ingestion)
* ✅ `SellOffer` - Schema exists (ready for orderbook integration)
* ✅ `ExchangeFlow` - Schema exists (ready for exchange flow tracking)
* ✅ `TokenMetrics` - Schema exists (ready for metrics aggregation)

All models compatible with Prisma and ready for use.

---

## 4. Frontend Updates

* `/whales` now uses Covalent data.
* `/sell-walls` unchanged.
* `/token/[symbol]` updated to include:

  * DEX liquidity events
  * DEX swaps
  * Whale events (Covalent)

---

## 5. Sprint Plan

### Sprint A — Covalent Integration ✅ COMPLETE

* ✅ Add CovalentService (integrated into IntegrationsModule)
* ✅ Large transfers endpoint (`getLargeTransfers`, `getAllLargeTransfers`)
* ✅ Replace Bitquery logic in all services
* ✅ Cost logging and API usage tracking
* ✅ Broad monitoring integration

### Sprint B — Worker Updates ✅ COMPLETE

* ✅ Ingestion worker updated for Covalent
* ✅ Store WhaleEvent into DB (cron job every 15 minutes)
* ✅ Whale event processing and storage
* ✅ Wallet creation/update automation

### Sprint C — The Graph Integration ✅ COMPLETE

* ✅ DEX swap ingestion (cron job every 20 minutes)
* ✅ LP change ingestion (cron job every 30 minutes)
* ✅ Added LpChangeEvent model to Prisma schema
* ✅ Detection rules 6 & 7 implemented:
  * Rule 6: DEX Liquidity Increase
  * Rule 7: Repeated Large Swaps

### Sprint D — QuickNode Integration ✅ COMPLETE

* ✅ Solana RPC logic (QuickNodeService)
* ✅ Solana transaction ingestion (cron job every 10 minutes)
* ✅ Token transfer extraction from Solana transactions
* ✅ Real-time streaming listener (basic implementation)

### Sprint E — Frontend Completion ⏳ NEXT

* ⏳ Update whale page to use Covalent data
* ⏳ Update token intelligence page to include DEX analytics
* ⏳ Add LP & Swap event components

### Sprint F — Beta + Launch ⏳ PENDING

* ⏳ Threshold tuning
* ⏳ Stripe subscription activation
* ⏳ Monitoring & error alerts

---

## 6. Deployment Plan

* Docker Compose (backend, frontend, postgres, redis)
* Traefik reverse proxy
* Production environment variables prepared
* Logging via Winston

---

## 7. Cost Optimization Plan

* Covalent free tier
* Cached responses using Redis
* Reduced call rate for non-critical analytics

---

## 8. Cursor Instructions

* Use `roadmap4.md` as the main file.
* All new endpoints must follow this structure.
* All workers must follow new provider integrations.
* Remove Bitquery references from the codebase.

---

## Final Notes

This is now the official roadmap for the platform. All development continues based on this document.
