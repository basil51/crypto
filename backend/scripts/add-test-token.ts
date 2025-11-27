import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🪙 Adding test token to database...');

  // Add a popular token that's not in the seed - let's use SOL (Solana)
  // Since Solana is on its own chain, let's use LINK (Chainlink) on Ethereum instead
  const testToken = {
    chain: 'ethereum',
    symbol: 'LINK',
    name: 'Chainlink',
    contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    active: true,
    metadata: { 
      coingeckoId: 'chainlink',
      addedForTesting: true,
      addedAt: new Date().toISOString()
    },
  };

  try {
    // Check if token already exists
    const existing = await prisma.token.findFirst({
      where: {
        OR: [
          { symbol: testToken.symbol, chain: testToken.chain },
          { contractAddress: testToken.contractAddress, chain: testToken.chain }
        ]
      }
    });

    if (existing) {
      console.log(`⚠️  Token ${testToken.symbol} already exists with ID: ${existing.id}`);
      console.log('   Updating it to ensure it\'s active...');
      await prisma.token.update({
        where: { id: existing.id },
        data: { active: true }
      });
      console.log('✅ Token updated');
    } else {
      const token = await prisma.token.create({ data: testToken });
      console.log(`✅ Created test token: ${token.symbol} (${token.name})`);
      console.log(`   ID: ${token.id}`);
      console.log(`   Chain: ${token.chain}`);
      console.log(`   Contract: ${token.contractAddress}`);
    }

    // Also add another popular token - UNI (Uniswap)
    const testToken2 = {
      chain: 'ethereum',
      symbol: 'UNI',
      name: 'Uniswap',
      contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: 18,
      active: true,
      metadata: { 
        coingeckoId: 'uniswap',
        addedForTesting: true,
        addedAt: new Date().toISOString()
      },
    };

    const existing2 = await prisma.token.findFirst({
      where: {
        OR: [
          { symbol: testToken2.symbol, chain: testToken2.chain },
          { contractAddress: testToken2.contractAddress, chain: testToken2.chain }
        ]
      }
    });

    if (existing2) {
      console.log(`⚠️  Token ${testToken2.symbol} already exists with ID: ${existing2.id}`);
      await prisma.token.update({
        where: { id: existing2.id },
        data: { active: true }
      });
      console.log('✅ Token updated');
    } else {
      const token2 = await prisma.token.create({ data: testToken2 });
      console.log(`✅ Created test token: ${token2.symbol} (${token2.name})`);
      console.log(`   ID: ${token2.id}`);
      console.log(`   Chain: ${token2.chain}`);
      console.log(`   Contract: ${token2.contractAddress}`);
    }

    // Add a BSC token - BUSD
    const testToken3 = {
      chain: 'bsc',
      symbol: 'BUSD',
      name: 'Binance USD',
      contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      decimals: 18,
      active: true,
      metadata: { 
        coingeckoId: 'binance-usd',
        addedForTesting: true,
        addedAt: new Date().toISOString()
      },
    };

    const existing3 = await prisma.token.findFirst({
      where: {
        OR: [
          { symbol: testToken3.symbol, chain: testToken3.chain },
          { contractAddress: testToken3.contractAddress, chain: testToken3.chain }
        ]
      }
    });

    if (existing3) {
      console.log(`⚠️  Token ${testToken3.symbol} already exists with ID: ${existing3.id}`);
      await prisma.token.update({
        where: { id: existing3.id },
        data: { active: true }
      });
      console.log('✅ Token updated');
    } else {
      const token3 = await prisma.token.create({ data: testToken3 });
      console.log(`✅ Created test token: ${token3.symbol} (${token3.name})`);
      console.log(`   ID: ${token3.id}`);
      console.log(`   Chain: ${token3.chain}`);
      console.log(`   Contract: ${token3.contractAddress}`);
    }

    console.log('\n✨ Test tokens added successfully!');
    console.log('   You can now check if alerts appear for these tokens.');
  } catch (error: any) {
    console.error('❌ Failed to add test token:', error.message);
    if (error.code === 'P2002') {
      console.error('   Token with this contract address already exists');
    }
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

