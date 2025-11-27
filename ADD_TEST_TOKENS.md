# Adding Test Tokens to Database

To test if alerts work for all coins, we need to add more tokens to the database. Here are several ways to do this:

## Option 1: Using Prisma Studio (Recommended - Easiest)

1. Run Prisma Studio:
   ```bash
   cd backend
   npx prisma studio
   ```

2. Open http://localhost:5555 in your browser
3. Click on "Token" model
4. Click "Add record"
5. Add the following tokens one by one:

### Token 1: LINK (Chainlink)
- chain: `ethereum`
- symbol: `LINK`
- name: `Chainlink`
- contractAddress: `0x514910771AF9Ca656af840dff83E8264EcF986CA`
- decimals: `18`
- active: `true` (checkbox)
- metadata: `{"coingeckoId": "chainlink", "addedForTesting": true}`

### Token 2: UNI (Uniswap)
- chain: `ethereum`
- symbol: `UNI`
- name: `Uniswap`
- contractAddress: `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984`
- decimals: `18`
- active: `true` (checkbox)
- metadata: `{"coingeckoId": "uniswap", "addedForTesting": true}`

### Token 3: BUSD (Binance USD)
- chain: `bsc`
- symbol: `BUSD`
- name: `Binance USD`
- contractAddress: `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`
- decimals: `18`
- active: `true` (checkbox)
- metadata: `{"coingeckoId": "binance-usd", "addedForTesting": true}`

## Option 2: Using the API (if backend is running)

1. First, login to get a token:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"password123"}'
   ```

2. Copy the `access_token` from the response

3. Create tokens using the API:
   ```bash
   # Add LINK
   curl -X POST http://localhost:3001/api/tokens \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "chain": "ethereum",
       "symbol": "LINK",
       "name": "Chainlink",
       "contractAddress": "0x514910771AF9Ca656af840dff83E8264EcF986CA",
       "decimals": 18,
       "active": true,
       "metadata": {"coingeckoId": "chainlink", "addedForTesting": true}
     }'

   # Add UNI
   curl -X POST http://localhost:3001/api/tokens \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "chain": "ethereum",
       "symbol": "UNI",
       "name": "Uniswap",
       "contractAddress": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
       "decimals": 18,
       "active": true,
       "metadata": {"coingeckoId": "uniswap", "addedForTesting": true}
     }'

   # Add BUSD
   curl -X POST http://localhost:3001/api/tokens \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{
       "chain": "bsc",
       "symbol": "BUSD",
       "name": "Binance USD",
       "contractAddress": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
       "decimals": 18,
       "active": true,
       "metadata": {"coingeckoId": "binance-usd", "addedForTesting": true}
     }'
   ```

## Option 3: Direct SQL (if you have database access)

Run these SQL commands directly on your PostgreSQL database:

```sql
-- Add LINK
INSERT INTO tokens (id, chain, symbol, name, contract_address, decimals, active, metadata, created_at)
VALUES (
  gen_random_uuid(),
  'ethereum',
  'LINK',
  'Chainlink',
  '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  18,
  true,
  '{"coingeckoId": "chainlink", "addedForTesting": true}'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add UNI
INSERT INTO tokens (id, chain, symbol, name, contract_address, decimals, active, metadata, created_at)
VALUES (
  gen_random_uuid(),
  'ethereum',
  'UNI',
  'Uniswap',
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  18,
  true,
  '{"coingeckoId": "uniswap", "addedForTesting": true}'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add BUSD
INSERT INTO tokens (id, chain, symbol, name, contract_address, decimals, active, metadata, created_at)
VALUES (
  gen_random_uuid(),
  'bsc',
  'BUSD',
  'Binance USD',
  '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  18,
  true,
  '{"coingeckoId": "binance-usd", "addedForTesting": true}'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;
```

## After Adding Tokens

Once you've added the tokens, you should:
1. Check the dashboard page - you should see alerts for LINK, UNI, and BUSD (not just the original 6)
2. Check the notifications page - same thing
3. If alerts still only show for the original 6 coins, the issue is likely in how alerts are being created/triggered, not in the database

## Notes

- The tokens added are: LINK (Chainlink), UNI (Uniswap), and BUSD (Binance USD)
- These are popular tokens that should have activity
- If alerts are still only showing for CAKE, USDC, ETH, MATIC, BNB, WBTC, then the problem is likely in the alert creation logic, not the database

