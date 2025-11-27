# Crypto Accumulation Detection Platform - Complete Flow Analysis

## Project Overview

This is a SaaS platform that detects accumulation/whale activity on crypto blockchains and sends early alerts. The system consists of:

- **Backend**: NestJS application with scheduled jobs, detection algorithms, and API endpoints
- **Frontend**: Next.js application with real-time WebSocket connections
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for caching
- **External APIs**: Moralis, Alchemy, CoinGecko, The Graph, Bitquery

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Homepage   │  │  Dashboard   │  │  Token Pages, Alerts │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│         └──────────────────┼──────────────────────┘              │
│                            │                                     │
│                    ┌───────▼────────┐                            │
│                    │  API Client   │  WebSocket Client          │
│                    │  (api.ts)     │  (websocket.ts)             │
│                    └───────┬───────┘                            │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ HTTP/REST + WebSocket
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (NestJS)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    App Module                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│   │
│  │  │   Auth   │  │  Tokens  │  │  Wallets │  │  Alerts  ││   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘│   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│   │
│  │  │  Signals │  │   Jobs   │  │Integrations│  │WebSocket ││   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘│   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                    ┌───────▼────────┐                            │
│                    │  Prisma ORM    │                            │
│                    └───────┬────────┘                            │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ SQL Queries
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Users  │  │  Tokens  │  │Transactions│  │  Signals │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Wallets  │  │ Positions│  │  Alerts   │  │  Metrics  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└──────────────────────────────────────────────────────────────────┘
                             │
                             │ External API Calls
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              External APIs (Moralis, Alchemy, etc.)             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Process Flow 1: Application Startup

**File**: `backend/src/main.ts`

```
1. Load Environment Variables
   └─> dotenv.config() loads .env files
   
2. Create NestJS Application
   └─> NestFactory.create(AppModule)
   
3. Initialize Global Middleware
   ├─> SentryService.onModuleInit() - Error tracking
   ├─> ValidationPipe - Request validation
   ├─> CORS - Enable cross-origin requests
   └─> WebSocketAdapter - Enable WebSocket support
   
4. Start Server
   └─> app.listen(3001)
```

**File**: `backend/src/app.module.ts`

``` 
AppModule Initialization:
├─> ConfigModule - Load environment variables
├─> ThrottlerModule - Rate limiting
├─> PrismaModule - Database connection
├─> CacheModule - Redis connection
├─> ScheduleModule - Cron job scheduler
├─> AuthModule - Authentication
├─> UsersModule - User management
├─> TokensModule - Token management
├─> WalletsModule - Wallet tracking
├─> TransactionsModule - Transaction storage
├─> SignalsModule - Accumulation signals
├─> AlertsModule - Alert system
├─> IntegrationsModule - External API services
├─> JobsModule - Scheduled jobs
├─> BillingModule - Stripe integration
├─> WebSocketModule - Real-time updates
└─> Global Filters/Interceptors
    ├─> AllExceptionsFilter
    └─> MonitoringInterceptor
```

---

## Process Flow 2: Scheduled Jobs (Background Processing)

**File**: `backend/src/modules/jobs/jobs.service.ts`

### Job 1: Token Discovery (Every 15 minutes)
```
Cron: */15 * * * *
File: backend/src/modules/jobs/services/token-discovery.service.ts

1. Check if discovery is enabled
   └─> TOKEN_DISCOVERY_ENABLED env var

2. Discover from Multiple Sources (Parallel)
   ├─> discoverFromDEXs()
   │   └─> File: backend/src/modules/integrations/services/thegraph.service.ts
   │       └─> Query Uniswap/PancakeSwap pools via The Graph
   │
   ├─> discoverFromCoinGecko()
   │   └─> File: backend/src/modules/integrations/services/coingecko.service.ts
   │       └─> Get trending/new coins from CoinGecko API
   │
   ├─> discoverFromTransactions()
   │   └─> Extract token addresses from transaction raw data
   │
   ├─> discoverFromSignals()
   │   └─> Extract token addresses from signal metadata
   │
   └─> discoverFromWhaleTransactions()
       └─> Query large transfers via Bitquery (if available)

3. Deduplicate Tokens
   └─> Remove duplicates by chain:address

4. Add New Tokens to Database
   └─> File: backend/src/modules/tokens/tokens.service.ts
       └─> Create Token records with active=true
```

### Job 2: Transaction Ingestion (Every 5 minutes)
```
Cron: */5 * * * *
File: backend/src/modules/jobs/services/ingestion.service.ts

1. Get All Active Tokens
   └─> Query: Token.findMany({ active: true })

2. For Each Token:
   ├─> Get Latest Processed Block
   │   └─> Query: Transaction.findFirst({ orderBy: blockNumber desc })
   │
   ├─> Fetch New Transactions
   │   ├─> Try Moralis First
   │   │   └─> File: backend/src/modules/integrations/services/moralis.service.ts
   │   │       └─> GET /erc20/{address}/transfers
   │   │
   │   └─> Fallback to Alchemy
   │       └─> File: backend/src/modules/integrations/services/alchemy.service.ts
   │           └─> JSON-RPC: alchemy_getAssetTransfers
   │
   ├─> Normalize Transaction Data
   │   ├─> Moralis: transaction_hash → txHash
   │   ├─> Alchemy: hash → txHash, blockNum (hex) → blockNumber
   │   └─> Standardize: fromAddress, toAddress, amount, timestamp
   │
   ├─> Create/Update Wallets
   │   └─> File: backend/src/modules/wallets/wallets.service.ts
   │       └─> Upsert Wallet records for all unique addresses
   │
   └─> Store Transactions
       └─> File: backend/src/modules/transactions/transactions.service.ts
           └─> Transaction.createMany() with skipDuplicates=true
```

### Job 3: Wallet Positions Update (Every Hour)
```
Cron: 0 * * * *
File: backend/src/modules/jobs/services/positions.service.ts

1. Get All Active Tokens
   └─> Query: Token.findMany({ active: true })

2. For Each Token:
   ├─> Get All Unique Wallet Addresses
   │   └─> Query: Transaction.findMany({ distinct: ['fromAddress', 'toAddress'] })
   │
   ├─> For Each Wallet:
   │   ├─> Calculate Balance
   │   │   ├─> Sum incoming transactions (toAddress = wallet)
   │   │   └─> Subtract outgoing transactions (fromAddress = wallet)
   │   │
   │   └─> Update WalletPosition
   │       └─> Upsert: { walletId, tokenId, balance, lastUpdatedAt }
   │
   └─> Store in WalletPosition table
```

### Job 4: Accumulation Detection (Every 10 minutes)
```
Cron: */10 * * * *
File: backend/src/modules/jobs/services/detection.service.ts

1. Quick Token Discovery (Optional)
   └─> Run token-discovery to catch newly added tokens

2. Get All Active Tokens
   └─> Query: Token.findMany({ active: true })

3. For Each Token:
   ├─> Analyze Multiple Time Windows
   │   ├─> 1 hour window
   │   ├─> 6 hour window
   │   └─> 24 hour window
   │
   ├─> Build Detection Context
   │   ├─> Get token data
   │   ├─> Get transactions in time window
   │   └─> Get top 100 wallet positions
   │
   ├─> Run Detection Rules (Weighted Scoring)
   │   ├─> Rule 1: Concentrated Buys (weight: 0.3)
   │   │   └─> Detect multiple large buys by non-exchange wallets
   │   │
   │   ├─> Rule 2: Large Wallet Inflows (weight: 0.25)
   │   │   └─> Detect significant inflows to top wallets
   │   │
   │   ├─> Rule 3: New Whale Addresses (weight: 0.2)
   │   │   └─> Detect new addresses receiving large amounts
   │   │
   │   ├─> Rule 4: Holding Pattern Increase (weight: 0.15)
   │   │   └─> Detect wallets increasing holdings
   │   │
   │   └─> Rule 5: Transaction Volume Spike (weight: 0.1)
   │       └─> Detect sudden increase in transaction volume
   │
   ├─> Calculate Weighted Score (0-100)
   │   └─> Normalize: totalScore / totalWeight
   │
   ├─> If Score >= Threshold (default: 60)
   │   ├─> Create AccumulationSignal
   │   │   └─> File: backend/src/modules/signals/signals.service.ts
   │   │       └─> Store: score, signalType, windowStart, windowEnd, walletsInvolved
   │   │
   │   └─> If Score >= 75 (High Priority)
   │       ├─> Create Alerts for Signal
   │       │   └─> File: backend/src/modules/alerts/services/alert-dispatcher.service.ts
   │       │       └─> createAlertsForSignal()
   │       │
   │       └─> Dispatch Alerts Immediately
   │           └─> dispatchAlertsForSignal()
```

---

## Process Flow 3: Alert Creation and Dispatch

**File**: `backend/src/modules/alerts/services/alert-dispatcher.service.ts`

### Alert Creation
```
1. Get Signal Data
   └─> Query: AccumulationSignal.findUnique({ include: { token: true } })

2. Find Users to Notify
   └─> Query: User.findMany({ plan: 'PRO' })

3. For Each User:
   ├─> Check if Alert Already Exists
   │   └─> Query: Alert.findFirst({ userId, signalId })
   │
   └─> Create Alert Record
       └─> Alert.create({
             userId,
             signalId,
             channels: { telegram: false, email: true },
             status: PENDING
           })
```

### Alert Dispatch
```
1. Get Pending Alerts for Signal
   └─> Query: Alert.findMany({ signalId, status: PENDING })

2. For Each Alert:
   ├─> Get User and Signal Data
   │   └─> Include: user, signal.token
   │
   ├─> Send via Telegram (if enabled)
   │   └─> File: backend/src/modules/alerts/services/telegram.service.ts
   │       └─> Format message and send via Telegram Bot API
   │
   ├─> Send via Email (if enabled)
   │   └─> File: backend/src/modules/alerts/services/email.service.ts
   │       └─> Format HTML email and send via SMTP
   │
   ├─> Emit WebSocket Notification
   │   └─> File: backend/src/modules/websocket/websocket.gateway.ts
   │       └─> emitNotification(userId, notification)
   │
   └─> Update Alert Status
       ├─> If delivered: status = DELIVERED, deliveredAt = now()
       └─> If failed: status = FAILED
```

---

## Process Flow 4: Frontend User Authentication

**File**: `frontend/contexts/AuthContext.tsx`

```
1. App Initialization
   ├─> Check localStorage for 'access_token'
   ├─> Check localStorage for 'user'
   └─> Set initial state

2. User Login
   ├─> File: frontend/lib/api.ts
   │   └─> POST /api/auth/login
   │       └─> Body: { email, password }
   │
   ├─> Backend: backend/src/modules/auth/auth.controller.ts
   │   └─> AuthService.validateUser()
   │       ├─> Verify password with bcrypt
   │       └─> Generate JWT token
   │
   ├─> Store Token and User
   │   ├─> localStorage.setItem('access_token', token)
   │   └─> localStorage.setItem('user', JSON.stringify(user))
   │
   └─> Update AuthContext State

3. API Requests (Authenticated)
   ├─> File: frontend/lib/api.ts
   │   └─> request() method
   │       ├─> Get token from localStorage
   │       └─> Add Authorization: Bearer {token} header
   │
   └─> Backend: JWT Guard validates token
       └─> File: backend/src/modules/auth/guards/jwt-auth.guard.ts
```

---

## Process Flow 5: Frontend Data Loading

### Homepage Data Flow
**File**: `frontend/app/page.tsx`

```
1. Component Mount
   └─> useEffect() triggers

2. Load Initial Data (Parallel)
   ├─> api.getHomepageStats()
   │   └─> GET /api/public/stats
   │       └─> Backend: backend/src/app.controller.ts
   │
   ├─> api.getTopAccumulatingTokens(10)
   │   └─> GET /api/public/top-tokens?limit=10
   │       └─> Backend: backend/src/app.controller.ts
   │
   └─> api.getRecentWhaleTransactions(10)
       └─> GET /api/public/whale-transactions?limit=10
           └─> Backend: backend/src/app.controller.ts

3. WebSocket Connection (if authenticated)
   ├─> wsClient.connect(token)
   │   └─> File: frontend/lib/websocket.ts
   │       └─> Connect to ws://localhost:3001/ws?token={token}
   │
   ├─> Subscribe to Events
   │   ├─> 'whale_transaction' - Real-time whale transactions
   │   └─> 'stats_update' - Platform statistics updates
   │
   └─> Fallback Polling (every 60s if WebSocket fails)

4. Update UI
   └─> React state updates trigger re-render
```

### Dashboard Data Flow
**File**: `frontend/app/dashboard/page.tsx`

```
1. Protected Route Check
   └─> File: frontend/components/ProtectedRoute.tsx
       └─> Redirect to /login if not authenticated

2. Load Dashboard Data (Parallel)
   ├─> api.getTopAccumulatingTokens(20)
   ├─> api.getAlerts()
   ├─> api.getMyNotifications(10, true)
   ├─> api.getSmartMoneyLeaderboard(10)
   ├─> api.getNewBornTokens(10)
   └─> api.getTopGainers(10)

3. WebSocket Real-time Updates
   ├─> Subscribe to: ['dashboard_update', 'notification', 'whale_transaction', 'signal_update']
   │
   ├─> Handle 'dashboard_update' event
   │   └─> Update hot accumulations, whale alerts, smart money wallets
   │
   └─> Handle 'notification' event
       └─> Add new notification to whale alerts feed

4. Chain Filter
   └─> Filter data by selected chain (ALL, ETH, BSC, etc.)
```

---

## Process Flow 6: WebSocket Real-time Communication

**Backend**: `backend/src/modules/websocket/websocket.gateway.ts`
**Frontend**: `frontend/lib/websocket.ts`

### Connection Establishment
```
1. Frontend Initiates Connection
   └─> wsClient.connect(token)
       └─> new WebSocket('ws://localhost:3001/ws?token={token}')

2. Backend Handles Connection
   ├─> Extract token from query string
   ├─> Verify JWT token
   │   └─> JwtService.verify(token)
   │
   ├─> Attach user info to socket
   │   └─> client.userId = payload.sub
   │
   └─> Store client in Map<userId, WebSocket>

3. Send Welcome Message
   └─> { type: 'connected', message: 'WebSocket connection established' }
```

### Real-time Event Broadcasting
```
1. Signal Created (High Score)
   └─> DetectionService.createSignal()
       └─> WebSocketGateway.emitSignalUpdate(signalData)
           └─> Broadcast to all authenticated clients

2. Alert Dispatched
   └─> AlertDispatcherService.dispatchAlert()
       └─> WebSocketGateway.emitNotification(userId, notification)
           └─> Send to specific user

3. Dashboard Update
   └─> WebSocketGateway.emitDashboardUpdate(userId, data)
       └─> Send dashboard data to specific user

4. Whale Transaction Detected
   └─> WebSocketGateway.emitWhaleTransaction(data)
       └─> Broadcast to all authenticated clients
```

### Frontend Event Handling
```
1. Register Event Handlers
   ├─> wsClient.on('whale_transaction', handler)
   ├─> wsClient.on('notification', handler)
   ├─> wsClient.on('dashboard_update', handler)
   └─> wsClient.on('signal_update', handler)

2. Update React State
   └─> setState() triggers UI re-render

3. Automatic Reconnection
   └─> Exponential backoff retry on disconnect
```

---

## Process Flow 7: Token Detail Page

**File**: `frontend/app/token/[chain]/[address]/page.tsx`

```
1. Extract Route Parameters
   ├─> chain: string (from URL)
   └─> address: string (from URL)

2. Load Token Data
   ├─> api.getTokenByAddress(chain, address)
   │   └─> GET /api/tokens/by-address?chain={chain}&address={address}
   │       └─> Backend: backend/src/modules/tokens/tokens.controller.ts
   │
   ├─> api.getTokenPriceHistory(tokenId, '24h')
   │   └─> GET /api/tokens/{tokenId}/price-history?timeframe=24h
   │
   └─> api.getSignals({ tokenId, recentHours: 24 })
       └─> GET /api/signals?tokenId={tokenId}&recentHours=24

3. Display Token Information
   ├─> Token metadata (symbol, name, chain)
   ├─> Price chart (PriceVolumeChart component)
   ├─> Recent signals
   └─> Wallet positions (if Pro user)
```

---

## Process Flow 8: Billing and Subscription

**File**: `frontend/app/billing/page.tsx`

### Stripe Checkout
```
1. User Clicks "Upgrade to Pro"
   └─> api.createCheckoutSession('PRO')
       └─> POST /api/billing/checkout
           └─> Backend: backend/src/modules/billing/billing.controller.ts
               └─> StripeService.createCheckoutSession()
                   ├─> Create Stripe Checkout Session
                   └─> Return session URL

2. Redirect to Stripe Checkout
   └─> window.location.href = session.url

3. Stripe Webhook (After Payment)
   └─> POST /api/billing/webhook
       └─> Backend: backend/src/modules/billing/billing.controller.ts
           └─> Handle Stripe events:
               ├─> checkout.session.completed
               │   └─> Update User: plan=PRO, subscriptionStatus=active
               └─> customer.subscription.updated
                   └─> Update subscription status
```

---

## Data Models and Relationships

### Core Entities
```
User
├─> has many Alerts
├─> has many Payments
└─> has many Dashboards

Token
├─> has many Transactions
├─> has many AccumulationSignals
├─> has many WalletPositions
└─> has many Alerts

Wallet
├─> has many Transactions (from/to)
├─> has many WalletPositions
└─> has many WhaleEvents

Transaction
├─> belongs to Token
├─> belongs to Wallet (fromAddress)
└─> belongs to Wallet (toAddress)

AccumulationSignal
├─> belongs to Token
└─> has many Alerts

Alert
├─> belongs to User
├─> belongs to AccumulationSignal (optional)
└─> belongs to Token (optional)
```

---

## Key Files Reference

### Backend Core
- `backend/src/main.ts` - Application entry point
- `backend/src/app.module.ts` - Root module configuration
- `backend/src/app.controller.ts` - Public API endpoints

### Scheduled Jobs
- `backend/src/modules/jobs/jobs.service.ts` - Cron job scheduler
- `backend/src/modules/jobs/services/ingestion.service.ts` - Transaction ingestion
- `backend/src/modules/jobs/services/detection.service.ts` - Accumulation detection
- `backend/src/modules/jobs/services/token-discovery.service.ts` - Token discovery
- `backend/src/modules/jobs/services/positions.service.ts` - Wallet position updates

### Business Logic
- `backend/src/modules/signals/signals.service.ts` - Signal management
- `backend/src/modules/alerts/services/alert-dispatcher.service.ts` - Alert dispatch
- `backend/src/modules/tokens/tokens.service.ts` - Token management
- `backend/src/modules/wallets/wallets.service.ts` - Wallet tracking

### External Integrations
- `backend/src/modules/integrations/services/moralis.service.ts` - Moralis API
- `backend/src/modules/integrations/services/alchemy.service.ts` - Alchemy API
- `backend/src/modules/integrations/services/coingecko.service.ts` - CoinGecko API
- `backend/src/modules/integrations/services/thegraph.service.ts` - The Graph API

### Real-time
- `backend/src/modules/websocket/websocket.gateway.ts` - WebSocket server
- `frontend/lib/websocket.ts` - WebSocket client

### Frontend
- `frontend/app/page.tsx` - Homepage
- `frontend/app/dashboard/page.tsx` - User dashboard
- `frontend/lib/api.ts` - API client
- `frontend/contexts/AuthContext.tsx` - Authentication context

### Database
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/prisma/prisma.service.ts` - Prisma client

---

## Summary of Key Processes

1. **Token Discovery** (Every 15 min): Discovers new tokens from DEXs, CoinGecko, and transaction data
2. **Transaction Ingestion** (Every 5 min): Fetches new transactions from Moralis/Alchemy and stores them
3. **Position Updates** (Every hour): Calculates and updates wallet token balances
4. **Detection** (Every 10 min): Analyzes transactions to detect accumulation patterns and creates signals
5. **Alert Dispatch**: Immediately dispatches alerts for high-score signals via Telegram, Email, and WebSocket
6. **Real-time Updates**: WebSocket broadcasts signal updates, notifications, and whale transactions to connected clients
7. **Frontend**: React components fetch data via REST API and receive real-time updates via WebSocket

---

## Technology Stack

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL, Redis
- **Frontend**: Next.js 16, React 19, Tailwind CSS, TypeScript
- **External APIs**: Moralis, Alchemy, CoinGecko, The Graph, Bitquery
- **Real-time**: WebSocket (ws library)
- **Payment**: Stripe
- **Monitoring**: Sentry
- **Package Manager**: pnpm

---

*This flowchart document provides a comprehensive overview of all processes in the Crypto Accumulation Detection Platform. Each process is documented with file references for easy navigation.*

