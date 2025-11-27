-- Add test tokens to database
-- Run with: npx prisma db execute --file scripts/add-tokens.sql --schema prisma/schema.prisma

-- Add LINK (Chainlink) on Ethereum
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

-- Add UNI (Uniswap) on Ethereum
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

-- Add BUSD (Binance USD) on BSC
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

