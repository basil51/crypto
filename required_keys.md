# Required API Keys & Configuration

This file tracks all API keys and configuration required for the Crypto Accumulation Detection Platform.

**📝 Note:** Update this file whenever new API keys or services are integrated.

---

## ✅ Critical Keys (Required for Core Functionality)

### 1. **Moralis API Key**
- **Variable:** `MORALIS_API_KEY`
- **Purpose:** Fetching token transfers, native transactions, and blockchain data
- **Sign up:** https://moralis.io/
- **Free tier:** Yes
- **Status:** ⚠️ Required for transaction ingestion

### 2. **Alchemy API Key**
- **Variable:** `ALCHEMY_API_KEY`
- **Purpose:** Asset transfers, token balances, and blockchain data
- **Sign up:** https://www.alchemy.com/
- **Free tier:** Yes
- **Status:** ⚠️ Required for transaction ingestion

### 3. **JWT Secret**
- **Variable:** `JWT_SECRET`
- **Purpose:** User authentication token signing
- **Setup:** Generate a strong random string (32+ characters)
- **Status:** ✅ Required for auth

---

## ⚙️ Infrastructure Keys (Required for Development)

### 4. **Database URL**
- **Variable:** `DATABASE_URL`
- **Purpose:** PostgreSQL database connection
- **Format:** `postgresql://crypto_user:crypto_password@localhost:5433/crypto_db`
- **Status:** ✅ Required

### 5. **Redis URL**
- **Variable:** `REDIS_URL`
- **Purpose:** Caching and performance optimization
- **Format:** `redis://localhost:6380`
- **Status:** ✅ Required

---

## 📊 Monitoring Keys (Optional)

### Sentry DSN
- **Variable:** `SENTRY_DSN`
- **Purpose:** Error tracking and performance monitoring
- **Sign up:** https://sentry.io/
- **Free tier:** Yes (5,000 events/month)
- **Status:** 🟡 Optional - Recommended for production
- **Additional:** `SENTRY_RELEASE` - Release version (optional)

## 🔔 Optional Keys (Enhanced Features)

### 6. **CoinGecko API Key**
- **Variable:** `COINGECKO_API_KEY`
- **Purpose:** Token price data and market information
- **Sign up:** https://www.coingecko.com/en/api
- **Free tier:** Yes (limited rate, no key needed for basic)
- **Status:** 🟡 Optional - Nice to have for price data
- **Note:** Free tier works without key, Pro tier requires key for higher limits

### 7. **Telegram Bot Token**
- **Variable:** `TELEGRAM_BOT_TOKEN`
- **Purpose:** Send alerts and notifications via Telegram
- **Setup:** Create bot with @BotFather on Telegram
- **Free tier:** Yes
- **Status:** 🟡 Optional - For Telegram notifications

### 8. **SendGrid API Key**
- **Variable:** `SENDGRID_API_KEY`
- **Purpose:** Send email notifications and alerts
- **Sign up:** https://sendgrid.com/
- **Free tier:** Yes (100 emails/day)
- **Status:** 🟡 Optional - For email notifications

### 9. **Mailgun API Key**
- **Variable:** `MAILGUN_API_KEY`
- **Purpose:** Alternative email service
- **Sign up:** https://www.mailgun.com/
- **Free tier:** Yes (limited)
- **Status:** 🟡 Optional - Alternative to SendGrid

### 10. **Stripe Secret Key**
- **Variable:** `STRIPE_SECRET_KEY`
- **Purpose:** Payment processing for subscriptions
- **Sign up:** https://stripe.com/
- **Free tier:** Test mode available
- **Status:** 🟡 Optional - For billing features

### 11. **Binance Pay API Keys**
- **Variables:** `BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET_KEY`
- **Purpose:** USDT payment processing via Binance Pay
- **Sign up:** https://www.binance.com/en/binancepay
- **Free tier:** Yes (with merchant account)
- **Status:** 🟡 Optional - For USDT payments via Binance Pay
- **Note:** Alternative to Stripe for crypto-native users

### 12. **USDT Wallet Address (Manual Payments)**
- **Variable:** `USDT_WALLET_ADDRESS`
- **Purpose:** USDT wallet address for manual payment transfers
- **Network:** `USDT_NETWORK` (TRC20, ERC20, or BEP20)
- **Status:** 🟡 Optional - For manual USDT payment method
- **Note:** Required if using USDT_MANUAL payment method

---

## 📋 Planned Integrations (Future Keys)

### Bitquery API Key
- **Variable:** `BITQUERY_API_KEY`
- **Purpose:** Advanced whale tracking and wallet flow analysis
- **Sign up:** https://bitquery.io/
- **Status:** ⏳ Planned for Sprint 4

### Etherscan/BscScan API Keys
- **Variables:** `ETHERSCAN_API_KEY`, `BSCSCAN_API_KEY`, `POLYGONSCAN_API_KEY`
- **Purpose:** Smart contract verification, holder counts, transaction history
- **Sign up:** https://etherscan.io/apis, https://bscscan.com/apis
- **Status:** ⏳ Planned for Sprint 4

### The Graph API Key
- **Variable:** `THEGRAPH_API_KEY`
- **Purpose:** DEX liquidity pool monitoring via subgraphs
- **Sign up:** https://thegraph.com/
- **Status:** ⏳ Planned for Sprint 4

### Binance API Key (Optional)
- **Variable:** `BINANCE_API_KEY`
- **Purpose:** Higher rate limits for orderbook data
- **Sign up:** https://www.binance.com/en/my/settings/api-management
- **Free tier:** Yes (read-only keys available)
- **Status:** 🟡 Optional - Works without key, but recommended for production
- **Note:** Public endpoints work without key, but rate limits are lower

### KuCoin API Key (Optional)
- **Variable:** `KUCOIN_API_KEY`
- **Purpose:** Higher rate limits for orderbook data
- **Sign up:** https://www.kucoin.com/account/api
- **Free tier:** Yes (read-only keys available)
- **Status:** 🟡 Optional - Works without key, but recommended for production
- **Note:** Public endpoints work without key, but rate limits are lower

---

## 🚀 Quick Setup Guide

1. **Copy the example environment file:**
   ```bash
   cp env.example .env
   ```

2. **Add your API keys to `.env`:**
   ```env
   # Critical Keys
   MORALIS_API_KEY=your_moralis_key_here
   ALCHEMY_API_KEY=your_alchemy_key_here
   JWT_SECRET=your_long_random_secret_here
   
   # Optional Keys (add as needed)
   COINGECKO_API_KEY=your_coingecko_key_here
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   SENDGRID_API_KEY=your_sendgrid_key_here
   STRIPE_SECRET_KEY=your_stripe_key_here
   ```

3. **Restart the application:**
   ```bash
   pnpm dev
   ```

---

## 📊 Priority Matrix

| Key | Priority | Impact | Effort |
|-----|----------|--------|--------|
| Moralis API | 🔴 High | High - Transaction ingestion | Low |
| Alchemy API | 🔴 High | High - Transaction ingestion | Low |
| JWT Secret | 🔴 High | High - Authentication | Low |
| Database URL | 🔴 High | High - Data persistence | Low |
| Redis URL | 🟡 Medium | Medium - Performance | Low |
| CoinGecko API | 🟢 Low | Medium - Price data | Low |
| Telegram Bot | 🟢 Low | Low - Notifications | Low |
| Email (SendGrid/Mailgun) | 🟢 Low | Low - Notifications | Low |
| Stripe API | 🟢 Low | Low - Billing | Medium |

---

## 🔒 Security Notes

- **Never commit API keys to Git** - Use `.env` file (already in `.gitignore`)
- **Rotate keys regularly** for production environments
- **Use different keys** for development and production
- **Monitor API usage** to detect unauthorized access
- **Enable IP restrictions** where available (Moralis, Alchemy)

---

**Last Updated:** November 22, 2025  
**Maintained By:** Development Team  
**Review Frequency:** Update when new integrations are added

