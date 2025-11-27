// Simple script to add tokens without clearing database
// Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/add-tokens.ts

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🪙 Adding test tokens to database...');

  const tokensToAdd = [
    {
      chain: 'ethereum',
      symbol: 'LINK',
      name: 'Chainlink',
      contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'chainlink', addedForTesting: true },
    },
    {
      chain: 'ethereum',
      symbol: 'UNI',
      name: 'Uniswap',
      contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'uniswap', addedForTesting: true },
    },
    {
      chain: 'bsc',
      symbol: 'BUSD',
      name: 'Binance USD',
      contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      decimals: 18,
      active: true,
      metadata: { coingeckoId: 'binance-usd', addedForTesting: true },
    },
  ];

  for (const tokenData of tokensToAdd) {
    try {
      // Check if token already exists
      const existing = await prisma.token.findFirst({
        where: {
          OR: [
            { symbol: tokenData.symbol, chain: tokenData.chain },
            { contractAddress: tokenData.contractAddress, chain: tokenData.chain }
          ]
        }
      });

      if (existing) {
        console.log(`⚠️  Token ${tokenData.symbol} already exists. Updating to ensure it's active...`);
        await prisma.token.update({
          where: { id: existing.id },
          data: { active: true }
        });
        console.log(`✅ Updated token: ${tokenData.symbol}`);
      } else {
        const token = await prisma.token.create({ data: tokenData });
        console.log(`✅ Created token: ${token.symbol} (${token.name})`);
        console.log(`   ID: ${token.id}`);
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  Token ${tokenData.symbol} already exists (unique constraint)`);
      } else {
        console.error(`❌ Failed to add token ${tokenData.symbol}:`, error.message);
      }
    }
  }

  console.log('\n✨ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

