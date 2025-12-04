# How to Verify Solana Integration is Working

This guide helps you verify that Solana integration via QuickNode is properly set up and working.

## Prerequisites

1. **QuickNode API URL configured**
   - Add `QUICKNODE_API_URL` to `backend/config/local.env`
   - Format: `https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/`
   - Or use QuickNode's Solana RPC endpoint

2. **Solana tokens seeded**
   - Run: `cd backend && pnpm db:seed`
   - This will add SOL, USDC (Solana), and USDT (Solana) tokens

## Verification Steps

### Step 1: Check QuickNode Configuration

```bash
# Check if QUICKNODE_API_URL is set
cat backend/config/local.env | grep QUICKNODE_API_URL
```

If not set, add it:
```bash
echo "QUICKNODE_API_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/" >> backend/config/local.env
```

### Step 2: Verify Solana Tokens in Database

```bash
# Connect to database and check for Solana tokens
cd backend
npx prisma studio
# Or use psql:
# psql -h localhost -p 5433 -U crypto_user -d crypto_db
# SELECT * FROM tokens WHERE chain = 'solana';
```

You should see:
- SOL (Solana native token)
- USDC (Solana)
- USDT (Solana)

### Step 3: Check Backend Logs

Start the backend and watch for Solana ingestion logs:

```bash
cd backend
pnpm start:dev
```

Look for these log messages:
- `Starting Solana transaction ingestion from QuickNode...`
- `Processing Solana transactions for X tokens`
- `Found X Solana transfers for token...`
- `Solana transaction ingestion completed: X transactions stored`

### Step 4: Manually Trigger Solana Ingestion (Optional)

You can manually trigger the ingestion job via API:

```bash
# Get your auth token first (login)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Trigger Solana ingestion (if endpoint exists)
curl -X POST http://localhost:3001/api/jobs/ingest-solana \
  -H "Authorization: Bearer $TOKEN"
```

Or check the cron job schedule:
- Solana ingestion runs **every 10 minutes** automatically
- Check `backend/src/modules/jobs/jobs.service.ts` line ~180

### Step 5: Check Database for Solana Transactions

After waiting 10+ minutes (or manually triggering), check if transactions are being stored:

```sql
-- Check Solana transactions
SELECT 
  t.tx_hash,
  t.from_address,
  t.to_address,
  t.amount,
  t.timestamp,
  tok.symbol,
  tok.chain
FROM transactions t
JOIN tokens tok ON t.token_id = tok.id
WHERE tok.chain = 'solana'
ORDER BY t.timestamp DESC
LIMIT 10;
```

### Step 6: Check for Whale Events from Solana

```sql
-- Check Solana whale events
SELECT 
  we.id,
  we.event_type,
  we.amount,
  we.direction,
  we.timestamp,
  tok.symbol,
  tok.chain
FROM whale_events we
JOIN tokens tok ON we.token_id = tok.id
WHERE tok.chain = 'solana'
ORDER BY we.timestamp DESC
LIMIT 10;
```

### Step 7: Check Notifications Page

1. **Login to frontend**: http://localhost:3000/login
   - Email: `test@example.com`
   - Password: `password123`

2. **Navigate to Notifications**: http://localhost:3000/notifications

3. **Look for Solana alerts**:
   - Filter by chain (should show Solana option)
   - Look for whale buy/sell alerts
   - Check for accumulation signals

### Step 8: Verify API Endpoints

Check if Solana data is accessible via API:

```bash
# Get Solana tokens
curl http://localhost:3001/api/tokens?chain=solana

# Get recent signals (should include Solana if detected)
curl http://localhost:3001/api/signals?chain=solana

# Get whale events
curl http://localhost:3001/api/whales?chain=solana
```

## Troubleshooting

### Issue: No Solana transactions appearing

**Possible causes:**
1. QuickNode API URL not configured
   - **Fix**: Add `QUICKNODE_API_URL` to `.env`

2. QuickNode endpoint not responding
   - **Fix**: Test the endpoint directly:
     ```bash
     curl -X POST $QUICKNODE_API_URL \
       -H "Content-Type: application/json" \
       -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'
     ```

3. No active Solana tokens in database
   - **Fix**: Run seed again: `cd backend && pnpm db:seed`

4. Cron job not running
   - **Fix**: Check backend logs for cron job execution
   - Manually trigger via API if needed

### Issue: QuickNode API errors

**Check logs for:**
- `QuickNode API URL not configured` → Add `QUICKNODE_API_URL`
- `QuickNode RPC error: ...` → Check API key and endpoint URL
- `Failed to get recent token transactions` → Token mint address might be invalid

### Issue: Notifications not showing

**Check:**
1. Are alerts being created? (check `alerts` table)
2. Is the user subscribed? (check `alerts` table for `userId`)
3. Are alerts being delivered? (check `deliveredAt` field)

## Expected Behavior

Once working, you should see:

1. **Backend logs** (every 10 minutes):
   ```
   Starting Solana transaction ingestion from QuickNode...
   Processing Solana transactions for 3 tokens
   Found X Solana transfers for token...
   Solana transaction ingestion completed: X transactions stored
   ```

2. **Database**:
   - Transactions in `transactions` table with `chain = 'solana'`
   - Whale events in `whale_events` table (if large transfers detected)
   - Alerts in `alerts` table (if whale events trigger alerts)

3. **Frontend**:
   - Solana tokens visible in token list
   - Notifications/alerts showing Solana whale activity
   - Chain filter includes "Solana" option

## Quick Test

Run this to quickly verify everything:

```bash
# 1. Check config
grep QUICKNODE backend/config/local.env

# 2. Check tokens
cd backend && npx prisma studio
# Navigate to tokens table, filter by chain = 'solana'

# 3. Check backend is running
curl http://localhost:3001/api/health

# 4. Wait 10 minutes or manually trigger ingestion
# Then check transactions table for Solana entries
```

## Next Steps

Once verified:
- Monitor backend logs for regular Solana ingestion
- Check notifications page for Solana alerts
- Verify whale events are being created for large Solana transfers
- Test with different Solana tokens if needed

