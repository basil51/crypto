# ChainWhales.io - Project Roadmap & Features Specification
Multi-Chain Smart Money & Accumulation Tracker (2025-2026)

## Supported Blockchains (Phase 1 Launch - 6 Chains)
- Ethereum (EVM)
- Solana
- Base
- BNB Chain (BSC)
- Arbitrum
- Polygon

(Phase 2: Avalanche, TON, Tron, Sui, Blast)

## Core Pages & Dashboard Structure

### 1. Homepage / Landing Page
- Hero section with real-time "Top 10 Accumulating Tokens Right Now" (live feed)
- Live whale transactions ticker (last 10 big buys)
- Stats counter: Total tracked wallets, Total volume tracked, etc.
- Pricing plans + Free trial CTA

### 2. Main Dashboard (After Login)
- Unified multi-chain view (toggle between chains or "All Chains" mode)
- Sections:
  - Hot Accumulations (tokens with highest smart money inflow last 24h/7d)
  - Whale Alerts Feed (real-time)
  - Smart Money Wallets Leaderboard
  - New Born Tokens (first 30 min with whale buys)
  - Top Gainers Prediction (based on accumulation score)

### 3. Token Detail Page (/token/:chain/:address)
- Price chart + Volume + Accumulation Score (0-100)
- Whale transactions list (who bought/sold how much)
- Holder distribution + Bubble Map
- Smart Money vs Retail flow
- Social sentiment score
- "Buy the Dip" or "Accumulation Phase" badge

### 4. Whale Wallet Tracker (/wallet/:address)
- Wallet performance history (PnL %)
- Current holdings
- Recent transactions
- Win rate % (how many tokens they 5x+)
- Copy-trade button (future feature)

### 5. Smart Money Portfolios
- Pre-built lists:
  - Top 50 Winning Wallets (all chains)
  - Wintermute, GSR, Cumberland (institutions)
  - Ansem, Sigma, Murad wallets (KOLs)
  - Custom "Follow" feature

### 6. Alerts & Notifications
- Real-time alerts via:
  - Browser push
  - Telegram bot (most important!)
  - Discord webhook
  - Email
- Alert types:
  - Whale buys > $50K / $100K / $500K
  - Accumulation score > 80
  - Smart wallet enters new token
  - Token leaves accumulation phase (breakout alert)

### 7. Alpha Screener (The Killer Feature)
- Advanced filters:
  - Chain, Age, Volume, MCAP, Whale inflow %, Accumulation score
  - "Find next 100x" presets:
    - < $1M MC + > 5 smart wallets bought
    - Solana tokens < 10 min old with whale buy
    - ETH tokens with > 10 winning wallets accumulating

### 8. User Settings & API Access
- Manage alerts
- API keys (for pro users to build their own bots)
- Referral system (30% lifetime commission)

## Data Sources & APIs (Cost-Effective Stack)

| Feature                  | Primary API/Source                  | Backup Source               | Monthly Cost (est.) |
|--------------------------|-------------------------------------|-----------------------------|---------------------|
| Solana data              | Birdeye.so + Helius.dev             | Jupiter + Solana.fm         | $300-800           |
| EVM chains (ETH, Base, etc.) | Covalent OR Moralis                | TheGraph + Etherscan        | $200-600           |
| Whale labeling           | Arkham Intelligence (free tier first) → paid later | Own clustering + Nansen (later) | $0 → $1000     |
| Real-time transactions   | WebSocket from Helius, QuickNode, Alchemy | -                         | $400-1200          |
| DexScreener data         | DexScreener API (free)              | GeckoTerminal               | Free               |
| Token prices             | CoinGecko API + Birdeye            | -                           | Free               |
| Bubble Maps              | Bubblemaps API OR own implementation | -                         | $300-600           |
| Telegram/Discord bots    | Self-hosted                         | -                           | $50 (server)       |

Total estimated API cost at 10,000 users: $2,000 - $5,000/month (scalable)

## Pricing Plans (Very Profitable Model)

| Plan       | Price/month | Features                              | Target Users |
|------------|-------------|---------------------------------------|--------------|
| Free       | $0          | 5 alerts/day, delayed data (15 min)   | Testing      |
| Basic      | $49         | Real-time, 50 alerts/day, 3 chains    | Beginners    |
| Pro        | $149        | All chains, unlimited alerts, Telegram bot | Serious traders |
| Whale      | $499        | API access, custom alerts, priority support | Funds & pros |

Expected revenue at 1,000 Pro users = $149,000/month

## Launch Strategy (First 6 Months)
Month 1-2: Closed Beta (free for first 500 users on X)
Month 3: Public launch + Telegram alerts free for first week
Month 4+: Influencer partnerships + Affiliate program

This project has 95% chance to reach $50K-$200K MRR in first year if executed well.