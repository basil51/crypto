# Production Deployment Guide

This guide covers deploying the Crypto Accumulation Detection Platform to production.

## 📋 Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (managed or self-hosted)
- Redis instance (managed or self-hosted)
- Domain name with SSL certificate
- Environment variables configured

## 🐳 Docker Setup

### Backend Dockerfile

The backend uses a multi-stage build for optimal image size:

```dockerfile
# See backend/Dockerfile (to be created)
```

### Frontend Dockerfile

The frontend is built as a static Next.js application:

```dockerfile
# See frontend/Dockerfile (to be created)
```

### Docker Compose

A `docker-compose.yml` file orchestrates all services:

```yaml
# See docker-compose.yml (to be created)
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/crypto_db"

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# API Keys (Required)
MORALIS_API_KEY=your-moralis-api-key
ALCHEMY_API_KEY=your-alchemy-api-key

# API Keys (Optional - for higher rate limits)
BINANCE_API_KEY=your-binance-api-key
KUCOIN_API_KEY=your-kucoin-api-key

# Stripe (Required for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Binance Pay (Optional)
BINANCE_PAY_API_KEY=your-binance-pay-api-key
BINANCE_PAY_SECRET_KEY=your-binance-pay-secret-key
BINANCE_PAY_BASE_URL=https://bpay.binanceapi.com

# Sentry (Optional - for error tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Detection Thresholds (Configurable)
DETECTION_SIGNAL_THRESHOLD=60
DETECTION_WHALE_THRESHOLD=80
DETECTION_CONCENTRATED_THRESHOLD=70
SELL_WALL_THRESHOLD=50000
SELL_WALL_PRICE_RANGE=0.02
WHALE_BUY_THRESHOLD=100000
WHALE_SELL_THRESHOLD=100000
EXCHANGE_DEPOSIT_THRESHOLD=50000
EXCHANGE_WITHDRAWAL_THRESHOLD=50000
BREAKOUT_VOLUME_THRESHOLD=2.0
BREAKOUT_PRICE_CHANGE_THRESHOLD=0.15

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🚀 Deployment Steps

### 1. Build Docker Images

```bash
docker-compose build
```

### 2. Run Database Migrations

```bash
docker-compose run backend npx prisma migrate deploy
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Verify Health

```bash
curl https://api.yourdomain.com/health
```

## 📊 Monitoring

### Health Checks

- `/health` - Basic health check
- `/health/ready` - Readiness probe (checks DB, Redis)
- `/health/live` - Liveness probe

### Sentry Integration

Error tracking and performance monitoring is automatically enabled if `SENTRY_DSN` is configured.

### Logs

View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔄 Updates & Rollbacks

### Update Process

1. Pull latest code
2. Rebuild images: `docker-compose build`
3. Run migrations: `docker-compose run backend npx prisma migrate deploy`
4. Restart services: `docker-compose up -d`

### Rollback

1. Revert to previous commit
2. Rebuild and restart: `docker-compose up -d --build`

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable Sentry for error tracking
- [ ] Regular database backups
- [ ] Monitor API usage and costs

## 📈 Scaling

### Horizontal Scaling

- Backend: Run multiple instances behind a load balancer
- Frontend: Static files can be served via CDN
- Database: Use read replicas for read-heavy operations
- Redis: Use Redis Cluster for high availability

### Vertical Scaling

- Increase database resources
- Add more Redis memory
- Increase worker process count

## 🐛 Troubleshooting

### Database Connection Issues

Check `DATABASE_URL` and ensure database is accessible.

### Redis Connection Issues

Verify `REDIS_HOST` and `REDIS_PORT` are correct.

### API Rate Limits

Monitor API usage logs and adjust rate limiting or upgrade API plans.

## 📝 Notes

- All thresholds are configurable via environment variables
- Cron jobs run automatically in the backend container
- Webhooks require public URLs (use ngrok for local testing)
- Stripe webhooks must be configured in Stripe dashboard

