import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface ClusterAnalysis {
  walletAddresses: string[];
  totalValue: number;
  avgTransactionSize: number;
  firstSeen: Date;
  lastSeen: Date;
  transactionCount: number;
  clusterType: 'buy_cluster' | 'sell_cluster' | 'accumulation_cluster';
}

@Injectable()
export class WhaleClusterService {
  private readonly logger = new Logger(WhaleClusterService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Detect whale clusters for a token
   * Clusters are groups of wallets that show similar trading patterns
   */
  async detectClusters(
    tokenId: string,
    timeWindowHours: number = 24,
    minClusterSize: number = 3,
    minTransactionValue: number = 10000, // $10k minimum
  ): Promise<ClusterAnalysis[]> {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    // Get all large transactions for this token
    const transactions = await this.prisma.transaction.findMany({
      where: {
        tokenId,
        timestamp: { gte: since },
      },
      include: {
        token: true,
      },
    });

    // Group transactions by wallet and calculate totals
    const walletStats = new Map<string, {
      buys: number;
      sells: number;
      totalBuyValue: number;
      totalSellValue: number;
      transactions: any[];
      firstTx: Date;
      lastTx: Date;
    }>();

    for (const tx of transactions) {
      const value = parseFloat(tx.amount.toString());
      if (value < minTransactionValue) continue;

      // Determine if buy or sell (simplified: toAddress is buy, fromAddress is sell)
      const isBuy = tx.toAddress && !this.isExchangeAddress(tx.toAddress);
      const isSell = tx.fromAddress && !this.isExchangeAddress(tx.fromAddress);

      if (isBuy && tx.toAddress) {
        const stats = walletStats.get(tx.toAddress) || {
          buys: 0,
          sells: 0,
          totalBuyValue: 0,
          totalSellValue: 0,
          transactions: [],
          firstTx: tx.timestamp,
          lastTx: tx.timestamp,
        };
        stats.buys++;
        stats.totalBuyValue += value;
        stats.transactions.push(tx);
        if (tx.timestamp < stats.firstTx) stats.firstTx = tx.timestamp;
        if (tx.timestamp > stats.lastTx) stats.lastTx = tx.timestamp;
        walletStats.set(tx.toAddress, stats);
      }

      if (isSell && tx.fromAddress) {
        const stats = walletStats.get(tx.fromAddress) || {
          buys: 0,
          sells: 0,
          totalBuyValue: 0,
          totalSellValue: 0,
          transactions: [],
          firstTx: tx.timestamp,
          lastTx: tx.timestamp,
        };
        stats.sells++;
        stats.totalSellValue += value;
        stats.transactions.push(tx);
        if (tx.timestamp < stats.firstTx) stats.firstTx = tx.timestamp;
        if (tx.timestamp > stats.lastTx) stats.lastTx = tx.timestamp;
        walletStats.set(tx.fromAddress, stats);
      }
    }

    // Identify clusters based on timing and patterns
    const clusters: ClusterAnalysis[] = [];

    // Group wallets by time windows (wallets trading within same hour)
    const timeWindows = new Map<string, Set<string>>();

    for (const [address, stats] of walletStats.entries()) {
      // Round to hour for clustering
      const hourKey = new Date(stats.firstTx).toISOString().slice(0, 13); // YYYY-MM-DDTHH

      if (!timeWindows.has(hourKey)) {
        timeWindows.set(hourKey, new Set());
      }
      timeWindows.get(hourKey)!.add(address);
    }

    // Create clusters from time windows
    for (const [hourKey, addresses] of timeWindows.entries()) {
      if (addresses.size < minClusterSize) continue;

      const addressArray = Array.from(addresses);
      const clusterStats = addressArray.map(addr => walletStats.get(addr)!);

      // Determine cluster type
      const totalBuys = clusterStats.reduce((sum, s) => sum + s.buys, 0);
      const totalSells = clusterStats.reduce((sum, s) => sum + s.sells, 0);
      const totalBuyValue = clusterStats.reduce((sum, s) => sum + s.totalBuyValue, 0);
      const totalSellValue = clusterStats.reduce((sum, s) => sum + s.totalSellValue, 0);

      let clusterType: 'buy_cluster' | 'sell_cluster' | 'accumulation_cluster';
      if (totalBuyValue > totalSellValue * 2) {
        clusterType = 'buy_cluster';
      } else if (totalSellValue > totalBuyValue * 2) {
        clusterType = 'sell_cluster';
      } else {
        clusterType = 'accumulation_cluster';
      }

      const totalValue = totalBuyValue + totalSellValue;
      const avgTransactionSize = clusterStats.reduce((sum, s) => sum + s.transactions.length, 0) / clusterStats.length;
      const firstSeen = new Date(Math.min(...clusterStats.map(s => s.firstTx.getTime())));
      const lastSeen = new Date(Math.max(...clusterStats.map(s => s.lastTx.getTime())));

      clusters.push({
        walletAddresses: addressArray,
        totalValue,
        avgTransactionSize,
        firstSeen,
        lastSeen,
        transactionCount: clusterStats.reduce((sum, s) => sum + s.transactions.length, 0),
        clusterType,
      });
    }

    return clusters;
  }

  /**
   * Save detected clusters to database
   */
  async saveClusters(tokenId: string, clusters: ClusterAnalysis[]): Promise<void> {
    for (const cluster of clusters) {
      // Check if cluster already exists (same wallets, same token, similar time)
      const existing = await this.prisma.whaleCluster.findFirst({
        where: {
          tokenId,
          clusterType: cluster.clusterType,
          firstSeen: {
            gte: new Date(cluster.firstSeen.getTime() - 60 * 60 * 1000), // 1 hour window
            lte: new Date(cluster.firstSeen.getTime() + 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        // Update existing cluster
        await this.prisma.whaleCluster.update({
          where: { id: existing.id },
          data: {
            walletAddresses: cluster.walletAddresses,
            totalValue: new Prisma.Decimal(cluster.totalValue),
            avgTransactionSize: new Prisma.Decimal(cluster.avgTransactionSize),
            lastSeen: cluster.lastSeen,
            transactionCount: cluster.transactionCount,
            metadata: {
              updatedAt: new Date(),
            },
          },
        });
      } else {
        // Create new cluster
        await this.prisma.whaleCluster.create({
          data: {
            tokenId,
            clusterType: cluster.clusterType,
            walletAddresses: cluster.walletAddresses,
            totalValue: new Prisma.Decimal(cluster.totalValue),
            avgTransactionSize: new Prisma.Decimal(cluster.avgTransactionSize),
            firstSeen: cluster.firstSeen,
            lastSeen: cluster.lastSeen,
            transactionCount: cluster.transactionCount,
          },
        });
      }
    }
  }

  /**
   * Get clusters for a token
   */
  async getClusters(
    tokenId: string,
    clusterType?: string,
    limit: number = 50,
  ) {
    return this.prisma.whaleCluster.findMany({
      where: {
        tokenId,
        ...(clusterType ? { clusterType } : {}),
      },
      orderBy: { totalValue: 'desc' },
      take: limit,
      include: {
        token: {
          select: {
            id: true,
            symbol: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Analyze whale relationships
   */
  async analyzeRelationships(
    tokenId?: string,
    minStrength: number = 50,
  ): Promise<Array<{
    wallet1: string;
    wallet2: string;
    relationshipType: string;
    strength: number;
    token?: { id: string; symbol: string };
  }>> {
    // Get transactions to analyze relationships
    const where: any = {};
    if (tokenId) {
      where.tokenId = tokenId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      take: 10000, // Limit for performance
      orderBy: { timestamp: 'desc' },
    });

    // Build relationship graph
    const relationships = new Map<string, {
      wallet1: string;
      wallet2: string;
      tokens: Set<string>;
      interactions: number;
      firstInteraction: Date;
      lastInteraction: Date;
    }>();

    for (const tx of transactions) {
      if (!tx.fromAddress || !tx.toAddress) continue;
      if (this.isExchangeAddress(tx.fromAddress) || this.isExchangeAddress(tx.toAddress)) continue;

      const key = [tx.fromAddress, tx.toAddress].sort().join('-');
      const rel = relationships.get(key) || {
        wallet1: tx.fromAddress < tx.toAddress ? tx.fromAddress : tx.toAddress,
        wallet2: tx.fromAddress < tx.toAddress ? tx.toAddress : tx.fromAddress,
        tokens: new Set<string>(),
        interactions: 0,
        firstInteraction: tx.timestamp,
        lastInteraction: tx.timestamp,
      };

      rel.tokens.add(tx.tokenId);
      rel.interactions++;
      if (tx.timestamp < rel.firstInteraction) rel.firstInteraction = tx.timestamp;
      if (tx.timestamp > rel.lastInteraction) rel.lastInteraction = tx.timestamp;
      relationships.set(key, rel);
    }

    // Calculate relationship strengths and types
    const results = Array.from(relationships.values())
      .map(rel => {
        // Strength based on interactions and time span
        const timeSpan = rel.lastInteraction.getTime() - rel.firstInteraction.getTime();
        const days = timeSpan / (24 * 60 * 60 * 1000);
        const strength = Math.min(100, (rel.interactions * 10) + (rel.tokens.size * 5) + (days > 0 ? 20 : 0));

        // Determine relationship type
        let relationshipType = 'same_token';
        if (rel.tokens.size > 1) {
          relationshipType = 'linked_transaction';
        }
        if (rel.interactions > 5 && days < 1) {
          relationshipType = 'copied_trade';
        }

        return {
          wallet1: rel.wallet1,
          wallet2: rel.wallet2,
          relationshipType,
          strength,
          token: tokenId ? { id: tokenId, symbol: '' } : undefined,
          interactions: rel.interactions,
          tokens: rel.tokens.size,
        };
      })
      .filter(rel => rel.strength >= minStrength)
      .sort((a, b) => b.strength - a.strength);

    // Save relationships to database
    for (const rel of results) {
      await this.saveRelationship(rel);
    }

    return results;
  }

  /**
   * Save or update a whale relationship
   */
  private async saveRelationship(rel: {
    wallet1: string;
    wallet2: string;
    relationshipType: string;
    strength: number;
    token?: { id: string; symbol: string };
    interactions: number;
    tokens: number;
  }) {
    const existing = await this.prisma.whaleRelationship.findUnique({
      where: {
        wallet1Address_wallet2Address_relationshipType: {
          wallet1Address: rel.wallet1,
          wallet2Address: rel.wallet2,
          relationshipType: rel.relationshipType,
        },
      },
    });

    if (existing) {
      await this.prisma.whaleRelationship.update({
        where: { id: existing.id },
        data: {
          strength: new Prisma.Decimal(rel.strength),
          lastInteraction: new Date(),
          interactionCount: rel.interactions,
          tokenId: rel.token?.id,
        },
      });
    } else {
      await this.prisma.whaleRelationship.create({
        data: {
          wallet1Address: rel.wallet1,
          wallet2Address: rel.wallet2,
          relationshipType: rel.relationshipType,
          strength: new Prisma.Decimal(rel.strength),
          tokenId: rel.token?.id,
          firstInteraction: new Date(),
          lastInteraction: new Date(),
          interactionCount: rel.interactions,
        },
      });
    }
  }

  /**
   * Get relationships for a wallet
   */
  async getWalletRelationships(walletAddress: string, limit: number = 50) {
    return this.prisma.whaleRelationship.findMany({
      where: {
        OR: [
          { wallet1Address: walletAddress },
          { wallet2Address: walletAddress },
        ],
      },
      orderBy: { strength: 'desc' },
      take: limit,
      include: {
        token: {
          select: {
            id: true,
            symbol: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Check if address is an exchange address (simplified)
   */
  private isExchangeAddress(address: string): boolean {
    // This is a placeholder - in production, maintain a list of known exchange addresses
    const exchangePrefixes = ['0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be']; // Binance hot wallet example
    return exchangePrefixes.some(prefix => address.toLowerCase().startsWith(prefix.toLowerCase()));
  }
}

