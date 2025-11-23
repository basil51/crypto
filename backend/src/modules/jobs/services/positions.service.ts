import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Update wallet positions for all tracked tokens
   */
  async updateWalletPositions(): Promise<void> {
    this.logger.log('Starting wallet positions update...');

    try {
      // Get all active tokens
      const tokens = await this.prisma.token.findMany({
        where: { active: true },
      });

      if (tokens.length === 0) {
        this.logger.warn('No active tokens to update positions for');
        return;
      }

      this.logger.log(`Updating positions for ${tokens.length} tokens`);

      // Process each token
      for (const token of tokens) {
        try {
          await this.updateTokenPositions(token.id);
        } catch (error) {
          this.logger.error(
            `Failed to update positions for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log('Wallet positions update completed');
    } catch (error) {
      this.logger.error(`Wallet positions update failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update positions for a specific token
   */
  private async updateTokenPositions(tokenId: string): Promise<void> {
    this.logger.debug(`Updating positions for token ${tokenId}`);

    // Get all unique wallets that have transactions for this token
    const wallets = await this.prisma.transaction.findMany({
      where: { tokenId },
      select: {
        fromAddress: true,
        toAddress: true,
      },
      distinct: ['fromAddress', 'toAddress'],
    });

    const uniqueAddresses = new Set<string>();
    wallets.forEach((w) => {
      if (w.fromAddress) uniqueAddresses.add(w.fromAddress);
      if (w.toAddress) uniqueAddresses.add(w.toAddress);
    });

    this.logger.debug(`Found ${uniqueAddresses.size} unique wallets for token ${tokenId}`);

    // Calculate current balance for each wallet
    for (const address of uniqueAddresses) {
      try {
        const balance = await this.calculateWalletBalance(address, tokenId);
        
        // Get or create wallet
        let wallet = await this.prisma.wallet.findUnique({
          where: { address },
        });

        if (!wallet) {
          wallet = await this.prisma.wallet.create({
            data: { address },
          });
        }

        // Update or create position
        await this.prisma.walletPosition.upsert({
          where: {
            walletId_tokenId: {
              walletId: wallet.id,
              tokenId,
            },
          },
          update: {
            balance: balance.toString(),
            lastUpdatedAt: new Date(),
          },
          create: {
            walletId: wallet.id,
            tokenId,
            balance: balance.toString(),
            lastUpdatedAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to update position for wallet ${address} and token ${tokenId}: ${error.message}`,
        );
        // Continue with next wallet
      }
    }
  }

  /**
   * Calculate current balance for a wallet and token
   */
  private async calculateWalletBalance(
    walletAddress: string,
    tokenId: string,
  ): Promise<number> {
    // Get all transactions for this wallet and token
    const incoming = await this.prisma.transaction.findMany({
      where: {
        tokenId,
        toAddress: walletAddress,
      },
      select: {
        amount: true,
      },
    });

    const outgoing = await this.prisma.transaction.findMany({
      where: {
        tokenId,
        fromAddress: walletAddress,
      },
      select: {
        amount: true,
      },
    });

    // Calculate net balance
    let balance = 0;
    incoming.forEach((tx) => {
      balance += Number(tx.amount);
    });
    outgoing.forEach((tx) => {
      balance -= Number(tx.amount);
    });

    return Math.max(0, balance); // Balance can't be negative
  }

  /**
   * Get position for a specific wallet and token
   */
  async getWalletPosition(walletId: string, tokenId: string) {
    return this.prisma.walletPosition.findUnique({
      where: {
        walletId_tokenId: {
          walletId,
          tokenId,
        },
      },
      include: {
        wallet: true,
        token: true,
      },
    });
  }

  /**
   * Get all positions for a token
   */
  async getTokenPositions(tokenId: string, limit?: number) {
    return this.prisma.walletPosition.findMany({
      where: { tokenId },
      orderBy: { balance: 'desc' },
      take: limit,
      include: {
        wallet: true,
        token: true,
      },
    });
  }
}

