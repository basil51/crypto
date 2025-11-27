# Broad Monitoring - Quick Start Guide

## What Was Implemented

✅ **New Bitquery Method**: `getAllLargeTransfers()` - fetches whale activity across ALL tokens
✅ **Broad Monitoring Service**: Automatically processes whale transactions and creates alerts
✅ **Scheduled Job**: Runs every 30 minutes to monitor all tokens
✅ **Manual Trigger Endpoint**: Test the system manually via API
✅ **Auto Token Discovery**: New tokens are added automatically when whale activity is detected

## How to Use

### 1. Ensure Bitquery is Configured

Check your `.env` file:

```bash
cat backend/config/local.env | grep BITQUERY_API_KEY
```

If not set, add:

```env
BITQUERY_API_KEY=your_api_key_here
```

### 2. Start the Backend

```bash
cd backend
pnpm dev
```

The broad monitoring job will run automatically every 30 minutes.

### 3. Manual Trigger (For Testing)

```bash
# Get your auth token first
TOKEN="your_jwt_token_here"

# Trigger broad monitoring
curl -X POST http://localhost:3001/api/jobs/broad-monitoring \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Check the Results

```bash
# View recent alerts
curl http://localhost:3001/api/alerts \
  -H "Authorization: Bearer $TOKEN"

# View notifications
curl http://localhost:3001/api/alerts/notifications \
  -H "Authorization: Bearer $TOKEN"
```

## What Happens When It Runs

1. **Fetches large transfers** (>$100k) from Bitquery across Ethereum, BSC, and Polygon
2. **Identifies tokens** involved in each transfer
3. **Auto-discovers new tokens** if they don't exist in the database
4. **Determines transfer type**:
   - Exchange withdrawal → WHALE_BUY alert
   - Exchange deposit → WHALE_SELL alert (or exchange deposit alert)
   - Wallet-to-wallet → Accumulation signal
5. **Creates alerts for all PRO users** with active subscriptions
6. **Sends real-time notifications** via WebSocket

## Example Output

When you trigger broad monitoring, you'll see logs like:

```
[BroadMonitoringService] 🔍 Starting broad token monitoring for whale activity...
[BitqueryService] Fetched 45 large transfers across all tokens from ethereum
[BroadMonitoringService] 🆕 Discovered new token from whale activity: PEPE (PepeCoin) on ethereum
[BroadMonitoringService] 🐋 Created whale BUY alert: PEPE - $150,000
[BroadMonitoringService] 🏦 Created exchange WITHDRAWAL alert: PEPE from Binance
[BroadMonitoringService] ✅ Broad monitoring completed: 45 transfers processed, 12 alerts created, 3 new tokens discovered
```

## API Endpoints

### Trigger Broad Monitoring

```http
POST /api/jobs/broad-monitoring
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "message": "Broad monitoring triggered"
}
```

### Check Job Status

```http
GET /api/jobs/status
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "message": "Jobs are running on schedule",
  "jobs": {
    "ingestion": "Every 5 minutes",
    "detection": "Every 10 minutes",
    "discovery": "Every 15 minutes",
    "broadMonitoring": "Every 30 minutes",
    "positionUpdates": "Every hour"
  }
}
```

## Alerts Generated

The system creates these alert types:

1. **WHALE_BUY**: Large withdrawal from exchange
2. **WHALE_SELL**: Large deposit to exchange
3. **EXCHANGE_DEPOSIT**: Token moving to exchange
4. **EXCHANGE_WITHDRAWAL**: Token leaving exchange

## Alert Metadata Example

```json
{
  "id": "alert-uuid",
  "alertType": "WHALE_BUY",
  "status": "PENDING",
  "token": {
    "id": "token-uuid",
    "symbol": "PEPE",
    "name": "PepeCoin",
    "chain": "ethereum",
    "contractAddress": "0x..."
  },
  "metadata": {
    "walletAddress": "0x123...",
    "amount": 150000,
    "transactionHash": "0xabc...",
    "timestamp": "2025-11-27T10:30:00Z",
    "tokenSymbol": "PEPE",
    "tokenName": "PepeCoin",
    "chain": "ethereum",
    "source": "broad_monitoring"
  },
  "createdAt": "2025-11-27T10:30:05Z"
}
```

## Who Gets Alerts?

Only **PRO users with active subscriptions** receive alerts from broad monitoring:

- Plan: `PRO`
- Subscription Status: `active` or `trialing` (not expired)

## Testing Checklist

- [ ] Bitquery API key is configured
- [ ] Backend is running
- [ ] You have a PRO user account
- [ ] You can manually trigger: `POST /api/jobs/broad-monitoring`
- [ ] Alerts are created: `GET /api/alerts`
- [ ] Notifications appear: `GET /api/alerts/notifications`
- [ ] WebSocket delivers real-time updates

## Troubleshooting

### "Bitquery not configured"
→ Add `BITQUERY_API_KEY` to your `.env` file

### "No alerts created"
→ Check if there are large transfers in the last hour
→ Verify you have PRO users in the database

### "BroadMonitoringService not available"
→ Ensure AlertsModule is imported in JobsModule
→ Check if the service is properly injected

## Configuration

Default settings (in `BroadMonitoringService`):

```typescript
minTransferUSD = 100000      // $100k minimum
networks = ['ethereum', 'bsc', 'matic']
limit = 100                  // Max transfers per network
interval = 30 minutes        // Cron schedule
```

To change these, edit:
```
backend/src/modules/alerts/services/broad-monitoring.service.ts
```

## Costs

- **Bitquery API**: ~$0.001 per query
- **Runs**: Every 30 minutes = 48 times/day
- **Queries**: 3 networks × 48 runs = 144 queries/day
- **Daily Cost**: ~$0.144 per day (~$4.32/month)

## Next Steps

1. ✅ Implementation complete
2. 🔄 Monitor performance and costs
3. 📊 Add analytics dashboard for whale activity
4. 🎯 Fine-tune thresholds based on user feedback
5. 🌐 Add more blockchain networks

---

**Status**: ✅ Ready to Use

**Last Updated**: November 27, 2025

