# Quick Guide: How to Check if Solana is Working

## Option 1: Quick Verification Script

Run the verification script:
```bash
./QUICK_VERIFY_SOLANA.sh
```

## Option 2: Manual Steps

### Step 1: Seed Solana Tokens
```bash
cd backend
pnpm db:seed
```

This will add:
- SOL (Solana native token)
- USDC on Solana
- USDT on Solana

### Step 2: Configure QuickNode (if not done)
Add to `backend/config/local.env`:
```
QUICKNODE_API_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

### Step 3: Check Backend Logs
Start backend and watch for:
```
Starting Solana transaction ingestion from QuickNode...
Processing Solana transactions for X tokens
Found X Solana transfers for token...
Solana transaction ingestion completed: X transactions stored
```

### Step 4: Check Database
```bash
cd backend
npx prisma studio
# Navigate to tokens table, filter: chain = 'solana'
# Navigate to transactions table, check for Solana entries
```

### Step 5: Check Notifications Page
1. Login: http://localhost:3000/login
   - Email: test@example.com
   - Password: password123

2. Go to: http://localhost:3000/notifications

3. Look for:
   - Solana chain filter button
   - Alerts/notifications with Solana tokens
   - Whale buy/sell alerts from Solana

### Step 6: Manually Trigger (Optional)
If you want to test immediately without waiting 10 minutes:

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Trigger Solana ingestion
curl -X POST http://localhost:3001/api/jobs/ingest-solana \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## What to Expect

✅ **Working correctly if:**
- Backend logs show Solana ingestion running
- Database has Solana transactions
- Notifications page shows Solana alerts
- Chain filter includes "Solana" option

❌ **Not working if:**
- No Solana tokens in database → Run seed
- No transactions appearing → Check QuickNode config
- No notifications → Check if alerts are being created

## Troubleshooting

**No Solana tokens?**
→ Run: `cd backend && pnpm db:seed`

**No transactions?**
→ Check `QUICKNODE_API_URL` in `backend/config/local.env`
→ Check backend logs for errors
→ Wait 10 minutes for cron job or trigger manually

**No notifications?**
→ Check if alerts are in database: `SELECT * FROM alerts WHERE token_id IN (SELECT id FROM tokens WHERE chain = 'solana');`
→ Make sure you're logged in as PRO user
→ Check notifications page filters

