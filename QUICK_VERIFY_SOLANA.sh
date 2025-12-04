#!/bin/bash

# Quick verification script for Solana integration
# Usage: ./QUICK_VERIFY_SOLANA.sh

echo "🔍 Verifying Solana Integration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: QuickNode API URL configured
echo "1️⃣  Checking QuickNode configuration..."
if grep -q "QUICKNODE_API_URL" backend/config/local.env && ! grep -q "QUICKNODE_API_URL=$" backend/config/local.env; then
    echo -e "${GREEN}✅ QuickNode API URL is configured${NC}"
else
    echo -e "${RED}❌ QuickNode API URL not configured${NC}"
    echo "   Add QUICKNODE_API_URL to backend/config/local.env"
fi
echo ""

# Check 2: Solana tokens in seed file
echo "2️⃣  Checking seed file for Solana tokens..."
if grep -q "chain: 'solana'" backend/prisma/seed.ts; then
    echo -e "${GREEN}✅ Solana tokens found in seed file${NC}"
    SOL_COUNT=$(grep -c "chain: 'solana'" backend/prisma/seed.ts)
    echo "   Found $SOL_COUNT Solana token(s)"
else
    echo -e "${YELLOW}⚠️  No Solana tokens in seed file${NC}"
    echo "   Run: cd backend && pnpm db:seed"
fi
echo ""

# Check 3: Backend running
echo "3️⃣  Checking if backend is running..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo "   Start with: cd backend && pnpm start:dev"
fi
echo ""

# Check 4: Database connection
echo "4️⃣  Checking database connection..."
cd backend
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
    
    # Check for Solana tokens
    SOL_TOKENS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM tokens WHERE chain = 'solana';" 2>/dev/null | grep -o '[0-9]' | head -1)
    if [ ! -z "$SOL_TOKENS" ] && [ "$SOL_TOKENS" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Found $SOL_TOKENS Solana token(s) in database${NC}"
    else
        echo -e "${YELLOW}   ⚠️  No Solana tokens in database${NC}"
        echo "      Run: cd backend && pnpm db:seed"
    fi
    
    # Check for Solana transactions
    SOL_TXS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM transactions t JOIN tokens tok ON t.token_id = tok.id WHERE tok.chain = 'solana';" 2>/dev/null | grep -o '[0-9]' | head -1)
    if [ ! -z "$SOL_TXS" ] && [ "$SOL_TXS" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Found $SOL_TXS Solana transaction(s)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  No Solana transactions yet${NC}"
        echo "      Wait 10 minutes for cron job or trigger manually"
    fi
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
fi
cd ..
echo ""

# Check 5: API endpoints
echo "5️⃣  Checking API endpoints..."
if curl -s http://localhost:3001/api/tokens?chain=solana > /dev/null 2>&1; then
    TOKEN_COUNT=$(curl -s http://localhost:3001/api/tokens?chain=solana | grep -o '"id"' | wc -l)
    if [ "$TOKEN_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ API endpoint working - Found $TOKEN_COUNT Solana token(s)${NC}"
    else
        echo -e "${YELLOW}⚠️  API endpoint working but no Solana tokens returned${NC}"
    fi
else
    echo -e "${RED}❌ Cannot reach API endpoint${NC}"
fi
echo ""

echo "📋 Summary:"
echo "   - To seed Solana tokens: cd backend && pnpm db:seed"
echo "   - To manually trigger ingestion: POST /api/jobs/ingest-solana (requires auth)"
echo "   - Check notifications at: http://localhost:3000/notifications"
echo "   - Full guide: See VERIFY_SOLANA.md"
echo ""

