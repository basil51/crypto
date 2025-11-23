# Integration Plans — Additional Data Sources

This document outlines the plan for integrating additional data sources beyond the currently implemented Moralis and Alchemy providers.

---

## Current Status

✅ **Implemented:**
- Moralis API (token transfers, transactions, metadata)
- Alchemy API (asset transfers, token balances, metadata)

---

## Planned Integrations

### 1. Bitquery Integration

**Purpose:** Advanced on-chain analytics, whale tracking, wallet flow analysis

**Key Features:**
- GraphQL API for flexible queries
- Real-time whale transfer detection
- Wallet clustering and behavioral analysis
- Cross-chain transaction tracking
- Token flow visualization

**Implementation Plan:**
- Create `BitqueryService` in `integrations/services/`
- Implement GraphQL client with retry logic
- Add whale tracking queries
- Integrate with detection engine
- Add to ingestion pipeline

**API Endpoints to Use:**
- `https://graphql.bitquery.io/` (GraphQL)
- Queries for large transfers, wallet movements, token flows

**Cost:** Paid service (pricing varies by usage)

---

### 2. Etherscan / BscScan / PolygonScan Integration

**Purpose:** Holder data, smart contract events, verified contract information

**Key Features:**
- Holder count tracking over time
- Smart contract event monitoring
- Verified contract source code
- Transaction history for addresses
- Token holder distribution

**Implementation Plan:**
- Create `EtherscanService` in `integrations/services/`
- Support multiple chains (Ethereum, BSC, Polygon)
- Implement rate limiting (5 calls/sec for free tier)
- Add holder count tracking
- Monitor contract events

**API Endpoints:**
- `https://api.etherscan.io/api` (Ethereum)
- `https://api.bscscan.com/api` (BSC)
- `https://api.polygonscan.com/api` (Polygon)

**Cost:** Free tier available (rate limited), paid tiers for higher limits

---

### 3. The Graph Integration

**Purpose:** DEX liquidity data, LP position changes, decentralized exchange analytics

**Key Features:**
- Liquidity pool monitoring
- LP position changes
- DEX trading volume
- Token pair analytics
- Subgraph-based indexing

**Implementation Plan:**
- Create `TheGraphService` in `integrations/services/`
- Query subgraphs for DEX data
- Monitor LP additions/removals
- Track liquidity changes
- Integrate with accumulation detection

**API Endpoints:**
- `https://api.thegraph.com/subgraphs/name/[subgraph-name]` (GraphQL)
- Various DEX subgraphs (Uniswap, PancakeSwap, etc.)

**Cost:** Free tier available, paid for higher query limits

---

## Integration Priority

**Recommended Order:**

1. **Etherscan/BscScan** (Easiest, free tier available)
   - Quick to implement
   - Provides holder count data
   - Useful for new token analysis

2. **Bitquery** (Most powerful, paid)
   - Advanced analytics
   - Whale tracking
   - Best for accumulation detection

3. **The Graph** (DEX-specific, moderate complexity)
   - Requires subgraph knowledge
   - Great for liquidity analysis
   - Complements on-chain data

---

## Implementation Notes

- All new services should follow the same pattern as `MoralisService` and `AlchemyService`
- Use the existing `IntegrationsService` for API usage logging
- Add retry logic and error handling
- Implement cost estimation
- Add provider availability checking
- Update `IngestionService` to use new providers as fallbacks

---

## Database Considerations

Current schema supports all planned integrations:
- `transactions` table can store data from any provider
- `api_usage_log` tracks all API calls
- `tokens` table works with all providers
- No schema changes needed for MVP

---

## Next Steps

1. Review and approve integration priorities
2. Start with Etherscan integration (Sprint 2 or later)
3. Add Bitquery when advanced analytics are needed
4. Add The Graph when DEX data becomes important

