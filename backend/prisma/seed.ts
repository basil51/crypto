import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('🗑️  Clearing existing data...');
  await prisma.alert.deleteMany();
  await prisma.accumulationSignal.deleteMany();
  await prisma.walletPosition.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.token.deleteMany();
  await prisma.user.deleteMany();
  await prisma.apiUsageLog.deleteMany();
  console.log('✅ Database cleared');

  // Create test users
  console.log('👤 Creating test users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash,
      role: 'ADMIN',
      plan: 'PRO',
      subscriptionStatus: 'active',
      subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  const testUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      passwordHash,
      role: 'USER',
      plan: 'FREE',
    },
  });

  const proUser = await prisma.user.create({
    data: {
      email: 'pro@test.com',
      passwordHash,
      role: 'USER',
      plan: 'PRO',
    },
  });

  console.log('✅ Created 3 test users');
  console.log('   - admin@test.com / password123 (ADMIN, PRO)');
  console.log('   - user@test.com / password123 (USER, FREE)');
  console.log('   - pro@test.com / password123 (USER, PRO)');

  // Create test tokens
  console.log('🪙 Creating test tokens...');
  const tokens = [
    {
      chain: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      contractAddress: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'ethereum' },
    },
    {
      chain: 'ethereum',
      symbol: 'USDC',
      name: 'USD Coin',
      contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      active: true,
      metadata: { coingeckoId: 'usd-coin' },
    },
    {
      chain: 'ethereum',
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      decimals: 8,
      active: true,
      metadata: { coingeckoId: 'wrapped-bitcoin' },
    },
    {
      chain: 'bsc',
      symbol: 'BNB',
      name: 'Binance Coin',
      contractAddress: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'binancecoin' },
    },
    {
      chain: 'bsc',
      symbol: 'CAKE',
      name: 'PancakeSwap Token',
      contractAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'pancakeswap-token' },
    },
    {
      chain: 'polygon',
      symbol: 'MATIC',
      name: 'Polygon',
      contractAddress: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'matic-network' },
    },
  ];

  const createdTokens = [];
  for (const tokenData of tokens) {
    const token = await prisma.token.create({ data: tokenData });
    createdTokens.push(token);
  }
  console.log(`✅ Created ${createdTokens.length} tokens`);

  // Create test wallets
  console.log('💼 Creating test wallets...');
  const wallets = [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      label: 'Whale Wallet 1',
      tracked: true,
    },
    {
      address: '0x8ba1f109551bD432803012645Hac136c22C9299',
      label: 'Exchange Wallet',
      tracked: true,
    },
    {
      address: '0x1234567890123456789012345678901234567890',
      label: 'Regular Wallet 1',
      tracked: false,
    },
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      label: 'Whale Wallet 2',
      tracked: true,
    },
  ];

  const createdWallets = [];
  for (const walletData of wallets) {
    const wallet = await prisma.wallet.create({ data: walletData });
    createdWallets.push(wallet);
  }
  console.log(`✅ Created ${createdWallets.length} wallets`);

  // Create test transactions
  console.log('📝 Creating test transactions...');
  const now = new Date();
  const transactions = [];

  // Create transactions for each token
  for (let i = 0; i < createdTokens.length; i++) {
    const token = createdTokens[i];
    const fromWallet = createdWallets[i % createdWallets.length];
    const toWallet = createdWallets[(i + 1) % createdWallets.length];

    // Create multiple transactions per token
    for (let j = 0; j < 10; j++) {
      const timestamp = new Date(now.getTime() - (j * 60 * 60 * 1000)); // Spread over last 10 hours
      const amount = BigInt(Math.floor(Math.random() * 1000000) + 100000); // Random amount
      const blockNumber = BigInt(18000000 + j);

      transactions.push({
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        fromAddress: fromWallet.address,
        toAddress: toWallet.address,
        tokenId: token.id,
        amount: amount.toString(),
        blockNumber: blockNumber.toString(),
        timestamp,
        raw: {
          provider: 'moralis',
          blockHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        },
      });
    }
  }

  // Insert transactions in batches
  for (const txData of transactions) {
    try {
      await prisma.transaction.create({ data: txData });
    } catch (error: any) {
      // Skip duplicates
      if (error.code !== 'P2002') {
        throw error;
      }
    }
  }
  console.log(`✅ Created ${transactions.length} transactions`);

  // Create wallet positions
  console.log('💰 Creating wallet positions...');
  for (const wallet of createdWallets) {
    for (const token of createdTokens.slice(0, 3)) {
      // Random balance
      const balance = (Math.random() * 1000000).toFixed(0);
      await prisma.walletPosition.upsert({
        where: {
          walletId_tokenId: {
            walletId: wallet.id,
            tokenId: token.id,
          },
        },
        update: {
          balance: balance,
          lastUpdatedAt: new Date(),
        },
        create: {
          walletId: wallet.id,
          tokenId: token.id,
          balance: balance,
        },
      });
    }
  }
  console.log('✅ Created wallet positions');

  // Create accumulation signals
  console.log('🚨 Creating accumulation signals...');
  const signalTypes = ['WHALE_INFLOW', 'EXCHANGE_OUTFLOW', 'CONCENTRATED_BUYS', 'HOLDING_PATTERNS', 'LP_INCREASE'];
  
  for (let i = 0; i < createdTokens.length; i++) {
    const token = createdTokens[i];
    const signalType = signalTypes[i % signalTypes.length];
    const score = 60 + Math.random() * 35; // Score between 60-95
    const windowStart = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
    const windowEnd = new Date(now.getTime() - (1 * 60 * 60 * 1000)); // 1 hour ago

    const walletsInvolved = createdWallets
      .slice(0, Math.floor(Math.random() * 3) + 1)
      .map((w) => w.address);

    await prisma.accumulationSignal.create({
      data: {
        tokenId: token.id,
        score: score.toFixed(2),
        signalType: signalType as any,
        windowStart,
        windowEnd,
        walletsInvolved,
        metadata: {
          transactionCount: Math.floor(Math.random() * 50) + 10,
          totalVolume: (Math.random() * 1000000).toFixed(2),
          averageBuySize: (Math.random() * 100000).toFixed(2),
        },
      },
    });
  }

  // Create a few more recent signals with higher scores
  for (let i = 0; i < 3; i++) {
    const token = createdTokens[Math.floor(Math.random() * createdTokens.length)];
    const scoreValue = 75 + Math.random() * 20; // Score between 75-95
    const windowStart = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // 6 hours ago
    const windowEnd = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes ago

    const signal = await prisma.accumulationSignal.create({
      data: {
        tokenId: token.id,
        score: scoreValue.toFixed(2),
        signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)] as any,
        windowStart,
        windowEnd,
        walletsInvolved: createdWallets.slice(0, 2).map((w) => w.address),
        metadata: {
          transactionCount: Math.floor(Math.random() * 100) + 20,
          totalVolume: (Math.random() * 2000000).toFixed(2),
          averageBuySize: (Math.random() * 200000).toFixed(2),
        },
      },
    });

    // Create alerts for PRO users for high-score signals
    if (scoreValue >= 75) {
      await prisma.alert.create({
        data: {
          userId: proUser.id,
          signalId: signal.id,
          channels: { telegram: false, email: true },
          status: 'PENDING',
        },
      });
    }
  }

  console.log('✅ Created accumulation signals and alerts');

  console.log('\n✨ Seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin: admin@test.com / password123');
  console.log('   User:  user@test.com / password123');
  console.log('   Pro:   pro@test.com / password123');
  console.log('\n🌐 Frontend: http://localhost:3000');
  console.log('🔌 Backend:  http://localhost:3001/api');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

