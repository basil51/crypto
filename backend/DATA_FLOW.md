# Data Flow: Moralis & Alchemy Integration

## Overview
The system fetches blockchain transaction data from **Moralis** and **Alchemy** APIs to detect accumulation patterns.

## Architecture

```
┌─────────────────┐
│  Jobs Service   │  (Scheduled Cron Job - runs every 5 minutes)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IngestionService │  (Orchestrates data fetching)
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ MoralisService  │  │ AlchemyService  │
└────────┬────────┘  └────────┬────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌─────────────────┐
│  Moralis API    │  │  Alchemy API    │
│  (REST)         │  │  (JSON-RPC)     │
└─────────────────┘  └─────────────────┘
```

## Data Flow Steps

### 1. **Scheduled Ingestion** (Cron Job)
- **Frequency**: Every 5 minutes
- **Trigger**: `JobsService.ingestTransactions()`
- **Action**: Iterates through all active tokens in the database

### 2. **Provider Selection** (Fallback Strategy)
```typescript
Priority: Moralis → Alchemy (fallback)

if (Moralis is configured) {
  try {
    fetch from Moralis
  } catch (error) {
    if (error is 400 - bad request) {
      skip token (invalid address/parameters)
    } else {
      fallback to Alchemy
    }
  }
} else if (Alchemy is configured) {
  fetch from Alchemy
}
```

### 3. **Moralis Data Fetching**

**Endpoint**: `GET /erc20/{contractAddress}/transfers`

**Parameters**:
- `chain`: Chain identifier (eth, bsc, polygon, etc.)
- `from_block`: Starting block number (optional)
- `limit`: Max results (default: 100)

**Response Format**:
```json
{
  "result": [
    {
      "transaction_hash": "0x...",
      "from_address": "0x...",
      "to_address": "0x...",
      "value": "1000000000000000000",
      "block_number": "12345678",
      "block_timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Normalization**:
- Maps `transaction_hash` → `txHash`
- Maps `from_address` → `fromAddress`
- Maps `to_address` → `toAddress`
- Maps `value` → `amount`
- Maps `block_number` → `blockNumber`
- Maps `block_timestamp` → `timestamp`

### 4. **Alchemy Data Fetching**

**Method**: `alchemy_getAssetTransfers` (JSON-RPC)

**Parameters**:
```json
{
  "contractAddresses": ["0x..."],
  "category": ["erc20"],
  "fromBlock": "0x1234567",
  "maxCount": 100
}
```

**Response Format**:
```json
{
  "result": {
    "transfers": [
      {
        "hash": "0x...",
        "from": "0x...",
        "to": "0x...",
        "value": 1000000000000000000,
        "blockNum": "0xbc614e",
        "metadata": {
          "blockTimestamp": "2024-01-01T00:00:00.000Z"
        }
      }
    ]
  }
}
```

**Normalization**:
- Maps `hash` → `txHash`
- Maps `from` → `fromAddress`
- Maps `to` → `toAddress`
- Maps `value` → `amount`
- Converts `blockNum` (hex) → `blockNumber` (decimal string)
- Maps `metadata.blockTimestamp` → `timestamp`

### 5. **Data Processing & Storage**

After fetching transfers:

1. **Extract Wallet Addresses**: Collect all unique `fromAddress` and `toAddress`
2. **Create/Update Wallets**: Ensure wallet records exist in database
3. **Create Transactions**: Store transaction records
4. **Update Positions**: Calculate wallet token balances
5. **Trigger Detection**: Signal detection service to analyze patterns

## Current Implementation Details

### Moralis Service
- **Base URL**: `https://deep-index.moralis.io/api/v2`
- **Authentication**: `X-API-Key` header
- **Rate Limiting**: 3 retries with 1-second delay
- **Error Handling**: Retries on 5xx and 429 errors

### Alchemy Service
- **Base URL**: `https://{network}.g.alchemy.com/v2`
- **Authentication**: API key in URL path
- **Method**: JSON-RPC POST requests
- **Rate Limiting**: 3 retries with 1-second delay
- **Error Handling**: Retries on network errors

## Limitations & Notes

### Current Limitations:
1. **Native Tokens**: Zero address (`0x0000...`) tokens are skipped (ETH, BNB, MATIC)
   - These require different API endpoints
   - Need native token transfer endpoints

2. **Moralis Endpoint**: `/erc20/{address}/transfers` is designed for wallet addresses
   - Works for token contracts but not optimal
   - Better: Use token-specific transfer endpoints

3. **Block Range**: No validation of block ranges before API calls
   - Can fail if `fromBlock > currentBlock`
   - Should fetch current block first

### Improvements Needed:
1. ✅ Skip invalid addresses (zero address)
2. ✅ Better error handling (400 errors)
3. ✅ Fallback mechanism (Moralis → Alchemy)
4. ⚠️ Add native token support
5. ⚠️ Validate block ranges
6. ⚠️ Use Moralis SDK for better token contract monitoring

## API Usage Logging

Both services log API usage to `apiUsageLog` table:
- Provider name (moralis/alchemy)
- Endpoint/method called
- Cost estimate (for billing)
- Timestamp

## Cost Tracking

**Moralis**:
- Token transfers: ~$0.0005 per request
- Metadata: ~$0.0001 per request
- Price data: ~$0.0002 per request

**Alchemy**:
- Asset transfers: ~$0.0005 per request
- Token balances: ~$0.0003 per request
- Block data: ~$0.0002 per request

