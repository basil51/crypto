# Broad Token Monitoring System

## Overview

The Broad Monitoring System is a powerful feature that **monitors whale activity across ALL tokens** without requiring users to subscribe to specific tokens. This allows the system to detect and alert on significant market movements for any token, even newly discovered ones.

## How It Works

### 1. **Bitquery Integration**

The system uses Bitquery's blockchain data to fetch large transfers (whale movements) across all tokens:

```typescript
// New method in BitqueryService
async getAllLargeTransfers(
  network: string = 'ethereum',
  minAmountUSD: number = 100000, // $100k minimum
  limit: number = 100,
  fromTime?: string,
): Promise<LargeTransfer[]>
```

**Key Features:**
- Monitors Ethereum, BSC, and Polygon networks
- Detects transfers >= $100,000 USD
- Runs every 30 minutes via cron job
- No token address required!

### 2. **Broad Monitoring Service**

The `BroadMonitoringService` processes whale transfers and:

1. **Identifies token information** from the transfer
2. **Auto-discovers new tokens** not in the database
3. **Detects transfer type**:
   - Exchange Withdrawal → Whale BUY signal
   - Exchange Deposit → Whale SELL signal
   - Wallet-to-Wallet → Accumulation signal
4. **Creates alerts for PRO users** automatically

### 3. **Alert Types Generated**

The system creates the following alerts:

- **Whale Buy Alerts**: Large withdrawals from exchanges
- **Whale Sell Alerts**: Large deposits to exchanges
- **Exchange Deposit Alerts**: Tokens moving to exchanges
- **Exchange Withdrawal Alerts**: Tokens leaving exchanges

## Benefits for PRO Users

### ✅ No Manual Subscription Required
- Users don't need to manually subscribe to specific tokens
- System automatically alerts on ANY significant whale activity
- Catch opportunities on tokens before they pump

### ✅ Early Discovery
- New tokens are automatically discovered from whale transactions
- Get alerts on emerging tokens with whale interest
- Stay ahead of the market

### ✅ Comprehensive Coverage
- Monitors all major networks (Ethereum, BSC, Polygon)
- Tracks 40+ known exchange wallets (Binance, Coinbase, Kraken)
- Real-time notifications via WebSocket

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cron Job (Every 30 min)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              BroadMonitoringService.monitorAllTokens()       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
          ┌────────────────┴────────────────┐
          │                                  │
          ▼                                  ▼
┌──────────────────────┐        ┌──────────────────────┐
│  BitqueryService     │        │   Process Transfers  │
│  getAllLargeTransfers│        │   - Identify token   │
│                      │        │   - Detect type      │
│  - Ethereum          │        │   - Create alerts    │
│  - BSC               │        │   - Discover tokens  │
│  - Polygon           │        └──────────┬───────────┘
└──────────────────────┘                   │
                                           ▼
                              ┌─────────────────────────┐
                              │ EnhancedAlertTrigger    │
                              │ - triggerWhaleBuyAlert  │
                              │ - triggerWhaleSellAlert │
                              │ - triggerExchangeDeposit│
                              │ - triggerExchangeWith... │
                              └─────────┬───────────────┘
                                        │
                                        ▼
                              ┌─────────────────────────┐
                              │  Alert Delivery         │
                              │  - WebSocket (real-time)│
                              │  - Email                │
                              │  - Telegram (optional)  │
                              └─────────────────────────┘
```

## Configuration

### Environment Variables

Make sure Bitquery is configured in your `.env`:

```env
BITQUERY_API_KEY=your_bitquery_api_key_here
```

### Monitoring Parameters

Default settings in `BroadMonitoringService`:

```typescript
minTransferUSD = 100000  // $100k minimum transfer value
networks = ['ethereum', 'bsc', 'matic']
limit = 100  // Max transfers per network per run
interval = 30 minutes  // Cron schedule
```

## Usage

### Automatic Monitoring

The system runs automatically every 30 minutes via cron job:

```typescript
@Cron('*/30 * * * *') // Every 30 minutes
async runBroadMonitoring()
```

### Manual Trigger (For Testing)

You can manually trigger broad monitoring via API:

```bash
# Trigger broad monitoring
POST /api/jobs/broad-monitoring
Authorization: Bearer {admin_token}
```

### Check Results

```bash
# Get recent alerts
GET /api/alerts
Authorization: Bearer {user_token}

# Get notifications
GET /api/alerts/notifications
Authorization: Bearer {user_token}
```

## API Response Example

When broad monitoring runs:

```json
{
  "success": true,
  "data": {
    "processed": 45,
    "alertsCreated": 12,
    "newTokensDiscovered": 3
  },
  "message": "Broad monitoring completed successfully"
}
```

## Monitored Exchanges

The system identifies transfers from/to these exchanges:

- **Binance**: 17 known wallet addresses
- **Coinbase**: 10 known wallet addresses
- **Kraken**: 8 known wallet addresses

## Alert Metadata

Each alert includes rich metadata:

```json
{
  "alertType": "WHALE_BUY",
  "token": {
    "id": "token-uuid",
    "symbol": "TOKEN",
    "name": "Token Name",
    "chain": "ethereum"
  },
  "metadata": {
    "walletAddress": "0x...",
    "amount": 150000,
    "transactionHash": "0x...",
    "timestamp": "2025-11-27T10:30:00Z",
    "tokenSymbol": "TOKEN",
    "tokenName": "Token Name",
    "chain": "ethereum",
    "source": "broad_monitoring"
  }
}
```

## Performance Considerations

- **Rate Limiting**: Bitquery API calls are rate-limited
- **Cost**: ~$0.001 per query (monitored in API usage logs)
- **Processing Time**: ~10-30 seconds per network
- **Memory Usage**: Processes up to 300 transfers per run (100 per network)

## Troubleshooting

### Broad Monitoring Not Running

Check logs:
```bash
# Check if Bitquery is configured
grep "BITQUERY_API_KEY" backend/config/local.env

# Check cron job logs
docker logs backend | grep "broad monitoring"
```

### No Alerts Being Created

1. Verify Bitquery API key is valid
2. Check if there are large transfers in the time window
3. Verify PRO users exist with active subscriptions
4. Check alert trigger service logs

### New Tokens Not Being Discovered

1. Check token discovery service logs
2. Verify token metadata can be fetched
3. Check if token already exists in database

## Future Enhancements

- [ ] Add more exchange wallet addresses
- [ ] Support more blockchain networks (Arbitrum, Avalanche, etc.)
- [ ] Implement ML-based pattern recognition for whale clusters
- [ ] Add configurable thresholds per user (PRO+ feature)
- [ ] Create digest emails with daily whale activity summary

## Testing

To test the broad monitoring system:

```bash
# 1. Ensure Bitquery is configured
cat backend/config/local.env | grep BITQUERY

# 2. Start the backend
cd backend && pnpm dev

# 3. Manually trigger (if admin endpoint added)
curl -X POST http://localhost:3001/api/jobs/broad-monitoring \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 4. Check logs
docker logs -f backend | grep "broad monitoring"

# 5. Verify alerts were created
curl http://localhost:3001/api/alerts \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

## Security Notes

- Only PRO users with active subscriptions receive alerts
- Alert deduplication prevents spam (5-minute window)
- Rate limiting protects against API abuse
- Exchange wallet addresses are hardcoded (not user-configurable)

---

**Status**: ✅ Implemented and Active

**Maintenance**: Monitor Bitquery API costs and adjust thresholds as needed

