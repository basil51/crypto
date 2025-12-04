import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { TokensService } from '../../tokens/tokens.service';
import { WalletsService } from '../../wallets/wallets.service';
import { WhaleEventType } from '@prisma/client';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private integrationsService: IntegrationsService,
    private transactionsService: TransactionsService,
    private tokensService: TokensService,
    private walletsService: WalletsService,
  ) {}

  /**
   * Ingest transactions for tracked tokens
   */
  async ingestTransactions(): Promise<void> {
    this.logger.log('Starting transaction ingestion...');

    try {
      // Get all active tracked tokens
      const tokens = await this.tokensService.findAll({ active: true });
      
      if (tokens.length === 0) {
        this.logger.warn('No active tokens to ingest');
        return;
      }

      this.logger.log(`Processing ${tokens.length} active tokens`);

      // Process each token
      for (const token of tokens) {
        try {
          await this.ingestTokenTransactions(token.id, token.chain, token.contractAddress);
        } catch (error) {
          this.logger.error(
            `Failed to ingest transactions for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log('Transaction ingestion completed');
    } catch (error) {
      this.logger.error(`Transaction ingestion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest whale events from Covalent
   * This method fetches large transfers and stores them as WhaleEvent records
   */
  async ingestWhaleEvents(): Promise<void> {
    this.logger.log('Starting whale event ingestion from Covalent...');

    try {
      // Check if Covalent is available
      const providers = this.integrationsService.getAvailableProviders();
      if (!providers.covalent) {
        this.logger.warn('Covalent not configured, skipping whale event ingestion');
        return;
      }

      // Get all active tracked tokens
      const tokens = await this.tokensService.findAll({ active: true });
      
      if (tokens.length === 0) {
        this.logger.warn('No active tokens to ingest whale events for');
        return;
      }

      this.logger.log(`Processing whale events for ${tokens.length} active tokens`);

      let totalEvents = 0;
      const minAmountUSD = 50000; // $50k minimum for whale events

      // Process each token
      for (const token of tokens) {
        try {
          const events = await this.ingestTokenWhaleEvents(
            token.id,
            token.chain,
            token.contractAddress,
            minAmountUSD,
          );
          totalEvents += events;
        } catch (error) {
          this.logger.error(
            `Failed to ingest whale events for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log(`Whale event ingestion completed: ${totalEvents} events stored`);
    } catch (error) {
      this.logger.error(`Whale event ingestion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest whale events for a specific token
   */
  private async ingestTokenWhaleEvents(
    tokenId: string,
    chain: string,
    contractAddress: string,
    minAmountUSD: number,
  ): Promise<number> {
    this.logger.debug(`Ingesting whale events for token ${tokenId} on ${chain}`);

    try {
      // Get large transfers from Covalent (last 24 hours)
      const fromTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const transfers = await this.integrationsService.covalent.getLargeTransfers(
        contractAddress,
        chain,
        minAmountUSD,
        100, // Limit to 100 transfers per token
        fromTime,
      );

      if (transfers.length === 0) {
        this.logger.debug(`No large transfers found for token ${tokenId}`);
        return 0;
      }

      this.logger.debug(`Found ${transfers.length} large transfers for token ${tokenId}`);

      // Process and store whale events
      let eventsStored = 0;
      for (const transfer of transfers) {
        try {
          const eventStored = await this.processAndStoreWhaleEvent(transfer, tokenId, chain);
          if (eventStored) {
            eventsStored++;
          }
        } catch (error) {
          this.logger.warn(`Failed to store whale event: ${error.message}`);
          // Continue with next transfer
        }
      }

      return eventsStored;
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status;
      const isAuthError = statusCode === 403 || statusCode === 401;
      
      if (isAuthError) {
        this.logger.warn(
          `Skipping whale event ingestion for token ${tokenId}: API authentication failed. ` +
          `Configure COVALENT_API_KEY in .env to enable whale event ingestion.`,
        );
        return 0;
      }
      
      this.logger.error(
        `Failed to ingest whale events for token ${tokenId}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Process and store a whale event from Covalent transfer data
   */
  private async processAndStoreWhaleEvent(
    transfer: any,
    tokenId: string,
    chain: string,
  ): Promise<boolean> {
    try {
      // Transfer format from CovalentService.getLargeTransfers():
      // {
      //   transaction: { hash, block: { timestamp: { time }, number } },
      //   amount: number,
      //   currency: { address, symbol, name },
      //   receiver: { address },
      //   sender: { address }
      // }
      
      // Determine event type and direction
      const amount = transfer.amount || 0;
      const valueUsd = null; // Covalent doesn't provide value_quote in LargeTransfer format
      
      // For now, we'll classify as LARGE_BUY (can be enhanced later with exchange detection)
      const eventType = WhaleEventType.LARGE_BUY;
      const direction = 'buy';

      // Ensure wallet exists
      const walletAddress = transfer.receiver?.address;
      if (walletAddress) {
        try {
          const existing = await this.walletsService.findByAddress(walletAddress);
          if (!existing) {
            await this.walletsService.create({
              address: walletAddress,
              tracked: false,
            });
          }
        } catch (error) {
          // Wallet might already exist, continue
          this.logger.debug(`Wallet ${walletAddress} already exists or error: ${error.message}`);
        }
      }

      // Get wallet ID if it exists
      let walletId: string | null = null;
      if (walletAddress) {
        const wallet = await this.walletsService.findByAddress(walletAddress);
        walletId = wallet?.id || null;
      }

      // Check if this event already exists (by transaction hash)
      const txHash = transfer.transaction?.hash;
      if (txHash) {
        const existing = await this.prisma.whaleEvent.findFirst({
          where: {
            tokenId,
            metadata: {
              path: ['transactionHash'],
              equals: txHash,
            },
          },
        });

        if (existing) {
          this.logger.debug(`Whale event already exists for transaction ${txHash}`);
          return false;
        }
      }

      // Store whale event
      // Convert amount to string with proper decimals handling
      const amountString = typeof amount === 'number' ? amount.toString() : amount?.toString() || '0';

      await this.prisma.whaleEvent.create({
        data: {
          tokenId,
          walletId,
          eventType,
          amount: amountString,
          valueUsd: valueUsd,
          direction,
          timestamp: new Date(transfer.transaction?.block?.timestamp?.time || Date.now()),
          metadata: {
            transactionHash: txHash,
            blockNumber: transfer.transaction?.block?.number,
            tokenSymbol: transfer.currency?.symbol,
            tokenName: transfer.currency?.name,
            chain,
            source: 'covalent',
            senderAddress: transfer.sender?.address,
            receiverAddress: transfer.receiver?.address,
          },
        },
      });

      return true;
    } catch (error: any) {
      // Skip if duplicate
      if (error.code === 'P2002') {
        this.logger.debug('Whale event already exists, skipping duplicate');
        return false;
      }
      throw error;
    }
  }

  /**
   * Ingest transactions for a specific token
   */
  private async ingestTokenTransactions(
    tokenId: string,
    chain: string,
    contractAddress: string,
  ): Promise<void> {
    this.logger.debug(`Ingesting transactions for token ${tokenId} on ${chain}`);

    try {
      // Skip native tokens (zero address) - they need different API endpoints
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (contractAddress.toLowerCase() === zeroAddress.toLowerCase()) {
        this.logger.debug(`Skipping native token ${tokenId} (zero address). Native tokens require different endpoints.`);
        return;
      }

      // Validate contract address format
      if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
        this.logger.warn(`Invalid contract address for token ${tokenId}: ${contractAddress}`);
        return;
      }

      // Get the latest block we've processed for this token
      const latestTransaction = await this.prisma.transaction.findFirst({
        where: { tokenId },
        orderBy: { blockNumber: 'desc' },
        select: { blockNumber: true },
      });

      const fromBlock = latestTransaction
        ? Number(latestTransaction.blockNumber) + 1
        : undefined;

      // Try Moralis first, fallback to Alchemy
      let transfers: any[] = [];
      const providers = this.integrationsService.getAvailableProviders();

      if (providers.moralis) {
        try {
          transfers = await this.fetchFromMoralis(contractAddress, chain, fromBlock);
        } catch (error: any) {
          // Check if it's a 400 error (bad request) - likely invalid address or block range
          const statusCode = error?.status || error?.response?.status;
          if (statusCode === 400) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Bad request';
            this.logger.warn(`Moralis rejected request for token ${tokenId}: ${errorMessage}`);
            // Don't try Alchemy if it's a bad request - same issue will occur
            return;
          }
          this.logger.warn(`Moralis failed, trying Alchemy: ${error.message}`);
          if (providers.alchemy) {
            try {
              transfers = await this.fetchFromAlchemy(contractAddress, chain, fromBlock);
            } catch (alchemyError: any) {
              const alchemyStatusCode = alchemyError?.status || alchemyError?.response?.status;
              if (alchemyStatusCode === 400) {
                this.logger.warn(`Alchemy also rejected request for token ${tokenId}: Invalid contract address or parameters`);
                return;
              }
              throw alchemyError;
            }
          }
        }
      } else if (providers.alchemy) {
        try {
          transfers = await this.fetchFromAlchemy(contractAddress, chain, fromBlock);
        } catch (error: any) {
          const statusCode = error?.status || error?.response?.status;
          if (statusCode === 400) {
            this.logger.warn(`Alchemy rejected request for token ${tokenId}: Invalid contract address or parameters`);
            return;
          }
          throw error;
        }
      } else {
        this.logger.warn('No API providers configured');
        return;
      }

      if (transfers.length === 0) {
        this.logger.debug(`No new transactions found for token ${tokenId}`);
        return;
      }

      // Process and store transactions
      await this.processAndStoreTransactions(transfers, tokenId, chain);

      this.logger.log(
        `Ingested ${transfers.length} transactions for token ${tokenId}`,
      );
    } catch (error: any) {
      // Check if it's an authentication/authorization error (403, 401)
      const statusCode = error?.status || error?.response?.status;
      const isAuthError = statusCode === 403 || statusCode === 401;
      
      if (isAuthError) {
        // Log auth errors as warnings - these are expected when API keys aren't configured
        this.logger.warn(
          `Skipping ingestion for token ${tokenId}: API authentication failed (${error.message}). ` +
          `Configure ALCHEMY_API_KEY or MORALIS_API_KEY in .env to enable ingestion.`,
        );
        // Don't throw - gracefully skip this token
        return;
      }
      
      // For other errors, log as error but don't crash the entire job
      this.logger.error(
        `Failed to ingest transactions for token ${tokenId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow other tokens to be processed
    }
  }

  /**
   * Fetch transfers from Moralis
   * Note: Moralis /erc20/{address}/transfers endpoint gets transfers TO/FROM a wallet address
   * For token contract monitoring, we need to get transfers where the token contract is involved
   */
  private async fetchFromMoralis(
    contractAddress: string,
    chain: string,
    fromBlock?: number,
  ): Promise<any[]> {
    const moralisChain = this.mapChainToMoralis(chain);
    
    try {
      // Get transfers involving this token contract
      // Note: This endpoint gets transfers TO/FROM the address, so we're getting
      // transfers where this contract address is the token being transferred
      const transfers = await this.integrationsService.moralis.getTokenTransfers(
        contractAddress,
        moralisChain,
        fromBlock,
        undefined, // Don't pass 'latest' - let Moralis handle it automatically
        100,
      );

      // Normalize and return
      return this.normalizeMoralisTransfers(transfers.result || []);
    } catch (error: any) {
      // Re-throw with more context
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      if (errorMessage.includes('to_block') || errorMessage.includes('from_block')) {
        throw new Error(`Block range error: ${errorMessage}. This usually means fromBlock is greater than current block.`);
      }
      throw error;
    }
  }

  /**
   * Fetch transfers from Alchemy
   */
  private async fetchFromAlchemy(
    contractAddress: string,
    chain: string,
    fromBlock?: number,
  ): Promise<any[]> {
    const params: any = {
      contractAddresses: [contractAddress],
      category: ['erc20'],
      maxCount: 100,
    };

    if (fromBlock) {
      params.fromBlock = `0x${fromBlock.toString(16)}`;
    }

    const response = await this.integrationsService.alchemy.getAssetTransfers(params);

    if (response?.result?.transfers) {
      return this.normalizeAlchemyTransfers(response.result.transfers);
    }

    return [];
  }

  /**
   * Normalize Moralis transfer format to our schema
   */
  private normalizeMoralisTransfers(transfers: any[]): any[] {
    return transfers.map((transfer) => ({
      txHash: transfer.transaction_hash,
      fromAddress: transfer.from_address,
      toAddress: transfer.to_address,
      amount: transfer.value || '0',
      blockNumber: transfer.block_number?.toString() || '0',
      timestamp: transfer.block_timestamp
        ? new Date(transfer.block_timestamp)
        : new Date(),
      raw: transfer,
    }));
  }

  /**
   * Normalize Alchemy transfer format to our schema
   */
  private normalizeAlchemyTransfers(transfers: any[]): any[] {
    return transfers.map((transfer) => ({
      txHash: transfer.hash,
      fromAddress: transfer.from,
      toAddress: transfer.to,
      amount: transfer.value || '0',
      blockNumber: transfer.blockNum ? parseInt(transfer.blockNum, 16).toString() : '0',
      timestamp: transfer.metadata?.blockTimestamp
        ? new Date(transfer.metadata.blockTimestamp)
        : new Date(),
      raw: transfer,
    }));
  }

  /**
   * Process and store transactions
   */
  private async processAndStoreTransactions(
    transfers: any[],
    tokenId: string,
    chain: string,
  ): Promise<void> {
    // Ensure wallets exist
    const walletAddresses = new Set<string>();
    transfers.forEach((t) => {
      if (t.fromAddress) walletAddresses.add(t.fromAddress);
      if (t.toAddress) walletAddresses.add(t.toAddress);
    });

    // Create or update wallets
    for (const address of walletAddresses) {
      try {
        const existing = await this.walletsService.findByAddress(address);
        if (!existing) {
          await this.walletsService.create({
            address,
            tracked: false, // Can be set to true later
          });
        }
      } catch (error) {
        // Wallet might already exist, continue
        this.logger.debug(`Wallet ${address} already exists or error: ${error.message}`);
      }
    }

    // Prepare transaction data
    const transactionData = transfers.map((transfer) => ({
      txHash: transfer.txHash,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenId,
      amount: transfer.amount.toString(),
      blockNumber: BigInt(transfer.blockNumber),
      timestamp: transfer.timestamp,
      raw: transfer.raw || {},
    }));

    // Store transactions (skip duplicates)
    try {
      await this.transactionsService.createMany(transactionData);
    } catch (error: any) {
      // If bulk insert fails, try individual inserts
      if (error.code === 'P2002' || error.message?.includes('unique')) {
        this.logger.debug('Some transactions already exist, skipping duplicates');
        // Try inserting individually
        for (const data of transactionData) {
          try {
            await this.transactionsService.create({
              txHash: data.txHash,
              fromAddress: data.fromAddress,
              toAddress: data.toAddress,
              amount: data.amount,
              blockNumber: data.blockNumber,
              timestamp: data.timestamp,
              raw: data.raw,
              token: { connect: { id: tokenId } },
            } as any);
          } catch (err: any) {
            // Skip if duplicate
            if (err.code !== 'P2002') {
              this.logger.warn(`Failed to insert transaction ${data.txHash}: ${err.message}`);
            }
          }
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Ingest DEX swap events from The Graph
   * This method fetches large swaps and stores them as DexSwapEvent records
   */
  async ingestDexSwaps(): Promise<void> {
    this.logger.log('Starting DEX swap ingestion from The Graph...');

    try {
      // Check if The Graph is available
      const providers = this.integrationsService.getAvailableProviders();
      if (!providers.thegraph) {
        this.logger.warn('The Graph not available, skipping DEX swap ingestion');
        return;
      }

      // Get all active tracked tokens
      const tokens = await this.tokensService.findAll({ active: true });
      
      if (tokens.length === 0) {
        this.logger.warn('No active tokens to ingest DEX swaps for');
        return;
      }

      this.logger.log(`Processing DEX swaps for ${tokens.length} active tokens`);

      let totalSwaps = 0;
      const minAmountUSD = 10000; // $10k minimum for swap events

      // Map chain to The Graph network
      const chainToNetwork: Record<string, 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2'> = {
        ethereum: 'uniswap-v2',
        bsc: 'pancakeswap-v2',
        polygon: 'uniswap-v2', // Polygon uses Uniswap V2 forks
      };

      // Process each token
      for (const token of tokens) {
        try {
          const network = chainToNetwork[token.chain.toLowerCase()];
          if (!network) {
            this.logger.debug(`Skipping token ${token.id} - unsupported chain for DEX: ${token.chain}`);
            continue;
          }

          const swaps = await this.ingestTokenDexSwaps(
            token.id,
            token.chain,
            token.contractAddress,
            network,
            minAmountUSD,
          );
          totalSwaps += swaps;
        } catch (error) {
          this.logger.error(
            `Failed to ingest DEX swaps for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log(`DEX swap ingestion completed: ${totalSwaps} swaps stored`);
    } catch (error) {
      this.logger.error(`DEX swap ingestion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest DEX swaps for a specific token
   */
  private async ingestTokenDexSwaps(
    tokenId: string,
    chain: string,
    contractAddress: string,
    network: 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2',
    minAmountUSD: number,
  ): Promise<number> {
    this.logger.debug(`Ingesting DEX swaps for token ${tokenId} on ${network}`);

    try {
      // Get large swaps from The Graph (last 24 hours)
      const fromTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const swaps = await this.integrationsService.thegraph.getLargeSwaps(
        contractAddress,
        network,
        minAmountUSD,
        100, // Limit to 100 swaps per token
        fromTimestamp,
      );

      if (swaps.length === 0) {
        this.logger.debug(`No large swaps found for token ${tokenId}`);
        return 0;
      }

      this.logger.debug(`Found ${swaps.length} large swaps for token ${tokenId}`);

      // Process and store swap events
      let swapsStored = 0;
      for (const swap of swaps) {
        try {
          const swapStored = await this.processAndStoreDexSwap(swap, tokenId, chain, network);
          if (swapStored) {
            swapsStored++;
          }
        } catch (error) {
          this.logger.warn(`Failed to store DEX swap: ${error.message}`);
          // Continue with next swap
        }
      }

      return swapsStored;
    } catch (error: any) {
      this.logger.error(
        `Failed to ingest DEX swaps for token ${tokenId}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Process and store a DEX swap event
   */
  private async processAndStoreDexSwap(
    swap: any,
    tokenId: string,
    chain: string,
    network: string,
  ): Promise<boolean> {
    try {
      // Determine swap type (buy/sell) based on amounts
      // If amount0In > 0 and amount1Out > 0, it's buying token1 (selling token0)
      // If amount1In > 0 and amount0Out > 0, it's buying token0 (selling token1)
      const amount0In = parseFloat(swap.amount0In || '0');
      const amount1In = parseFloat(swap.amount1In || '0');
      const amount0Out = parseFloat(swap.amount0Out || '0');
      const amount1Out = parseFloat(swap.amount1Out || '0');

      // Determine which token is being bought/sold
      // For simplicity, we'll consider it a buy if more tokens are coming out than going in
      const swapType = amount0Out > amount0In || amount1Out > amount1In ? 'buy' : 'sell';
      const amountIn = Math.max(amount0In, amount1In);
      const amountOut = Math.max(amount0Out, amount1Out);

      // Extract transaction hash from swap ID or transaction
      const txHash = swap.transaction?.id || swap.id?.split('-')[0] || '';
      const timestamp = swap.transaction?.timestamp 
        ? new Date(parseInt(swap.transaction.timestamp) * 1000)
        : new Date();

      // Check if this swap already exists
      if (txHash) {
        const existing = await this.prisma.dexSwapEvent.findFirst({
          where: {
            tokenId,
            txHash,
          },
        });

        if (existing) {
          this.logger.debug(`DEX swap already exists for transaction ${txHash}`);
          return false;
        }
      }

      // Store DEX swap event
      await this.prisma.dexSwapEvent.create({
        data: {
          tokenId,
          dex: network.replace('-v2', '').replace('-v3', ''), // uniswap, pancakeswap
          poolAddress: swap.pool?.id || null,
          swapType,
          amountIn: amountIn.toString(),
          amountOut: amountOut.toString(),
          priceImpact: null, // Can be calculated later if needed
          walletAddress: swap.to || null,
          txHash,
          blockNumber: BigInt(0), // The Graph doesn't provide block numbers directly
          timestamp,
          metadata: {
            transactionId: swap.transaction?.id,
            poolId: swap.pool?.id,
            token0Symbol: swap.pool?.token0?.symbol,
            token1Symbol: swap.pool?.token1?.symbol,
            amountUSD: swap.amountUSD,
            source: 'thegraph',
            network,
          },
        },
      });

      return true;
    } catch (error: any) {
      // Skip if duplicate
      if (error.code === 'P2002') {
        this.logger.debug('DEX swap already exists, skipping duplicate');
        return false;
      }
      throw error;
    }
  }

  /**
   * Ingest LP change events from The Graph
   * This method fetches liquidity pool mints/burns and stores them as LpChangeEvent records
   */
  async ingestLpChanges(): Promise<void> {
    this.logger.log('Starting LP change ingestion from The Graph...');

    try {
      // Check if The Graph is available
      const providers = this.integrationsService.getAvailableProviders();
      if (!providers.thegraph) {
        this.logger.warn('The Graph not available, skipping LP change ingestion');
        return;
      }

      // Get all active tracked tokens
      const tokens = await this.tokensService.findAll({ active: true });
      
      if (tokens.length === 0) {
        this.logger.warn('No active tokens to ingest LP changes for');
        return;
      }

      this.logger.log(`Processing LP changes for ${tokens.length} active tokens`);

      let totalChanges = 0;
      const minAmountUSD = 5000; // $5k minimum for LP changes

      // Map chain to The Graph network
      const chainToNetwork: Record<string, 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2'> = {
        ethereum: 'uniswap-v2',
        bsc: 'pancakeswap-v2',
        polygon: 'uniswap-v2',
      };

      // Process each token
      for (const token of tokens) {
        try {
          const network = chainToNetwork[token.chain.toLowerCase()];
          if (!network) {
            this.logger.debug(`Skipping token ${token.id} - unsupported chain for DEX: ${token.chain}`);
            continue;
          }

          // Get liquidity pools for this token
          const pools = await this.integrationsService.thegraph.getLiquidityPools(
            token.contractAddress,
            network,
            5, // Limit to top 5 pools
          );

          for (const pool of pools) {
            try {
              const changes = await this.ingestPoolLpChanges(
                token.id,
                token.chain,
                pool.id,
                network,
                minAmountUSD,
              );
              totalChanges += changes;
            } catch (error) {
              this.logger.warn(`Failed to ingest LP changes for pool ${pool.id}: ${error.message}`);
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to ingest LP changes for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log(`LP change ingestion completed: ${totalChanges} changes stored`);
    } catch (error) {
      this.logger.error(`LP change ingestion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest LP changes for a specific pool
   */
  private async ingestPoolLpChanges(
    tokenId: string,
    chain: string,
    poolAddress: string,
    network: 'uniswap-v2' | 'uniswap-v3' | 'pancakeswap-v2',
    minAmountUSD: number,
  ): Promise<number> {
    this.logger.debug(`Ingesting LP changes for pool ${poolAddress} on ${network}`);

    try {
      // Get liquidity changes from The Graph (last 24 hours)
      const fromTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const { mints, burns } = await this.integrationsService.thegraph.getLiquidityChanges(
        poolAddress,
        network,
        100, // Limit to 100 events per pool
        fromTimestamp,
      );

      const allChanges = [
        ...mints.map((m) => ({ ...m, changeType: 'mint' })),
        ...burns.map((b) => ({ ...b, changeType: 'burn' })),
      ].filter((change) => {
        const amountUSD = parseFloat(change.amountUSD || '0');
        return amountUSD >= minAmountUSD;
      });

      if (allChanges.length === 0) {
        this.logger.debug(`No significant LP changes found for pool ${poolAddress}`);
        return 0;
      }

      this.logger.debug(`Found ${allChanges.length} LP changes for pool ${poolAddress}`);

      // Process and store LP change events
      let changesStored = 0;
      for (const change of allChanges) {
        try {
          const changeStored = await this.processAndStoreLpChange(change, tokenId, chain, network, poolAddress);
          if (changeStored) {
            changesStored++;
          }
        } catch (error) {
          this.logger.warn(`Failed to store LP change: ${error.message}`);
          // Continue with next change
        }
      }

      return changesStored;
    } catch (error: any) {
      this.logger.error(
        `Failed to ingest LP changes for pool ${poolAddress}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Process and store an LP change event
   */
  private async processAndStoreLpChange(
    change: any,
    tokenId: string,
    chain: string,
    network: string,
    poolAddress: string,
  ): Promise<boolean> {
    try {
      const changeType = change.changeType; // 'mint' or 'burn'
      const amount0 = parseFloat(change.amount0 || '0');
      const amount1 = parseFloat(change.amount1 || '0');
      const amountUSD = parseFloat(change.amountUSD || '0');

      // Extract transaction hash
      const txHash = change.transaction?.id || change.id?.split('-')[0] || '';
      const timestamp = change.transaction?.timestamp 
        ? new Date(parseInt(change.transaction.timestamp) * 1000)
        : new Date();

      // Check if this LP change already exists
      if (txHash) {
        const existing = await this.prisma.lpChangeEvent.findFirst({
          where: {
            tokenId,
            poolAddress,
            txHash,
            changeType,
          },
        });

        if (existing) {
          this.logger.debug(`LP change already exists for transaction ${txHash}`);
          return false;
        }
      }

      // Store LP change event
      await this.prisma.lpChangeEvent.create({
        data: {
          tokenId,
          dex: network.replace('-v2', '').replace('-v3', ''), // uniswap, pancakeswap
          poolAddress,
          changeType,
          amount0: amount0.toString(),
          amount1: amount1.toString(),
          amountUSD: amountUSD > 0 ? amountUSD : null,
          walletAddress: null, // The Graph doesn't provide wallet address for mints/burns
          txHash,
          blockNumber: BigInt(0), // The Graph doesn't provide block numbers directly
          timestamp,
          metadata: {
            transactionId: change.transaction?.id,
            poolId: change.pool?.id,
            token0Symbol: change.pool?.token0?.symbol,
            token1Symbol: change.pool?.token1?.symbol,
            source: 'thegraph',
            network,
          },
        },
      });

      return true;
    } catch (error: any) {
      // Skip if duplicate
      if (error.code === 'P2002') {
        this.logger.debug('LP change already exists, skipping duplicate');
        return false;
      }
      throw error;
    }
  }

  /**
   * Ingest Solana transactions from QuickNode
   * This method fetches Solana token transfers and stores them as Transaction records
   */
  async ingestSolanaTransactions(): Promise<void> {
    this.logger.log('Starting Solana transaction ingestion from QuickNode...');

    try {
      // Check if QuickNode is available
      const providers = this.integrationsService.getAvailableProviders();
      if (!providers.quicknode) {
        this.logger.warn('QuickNode not configured, skipping Solana transaction ingestion');
        return;
      }

      // Get all active tracked tokens on Solana chain
      const tokens = await this.tokensService.findAll({ 
        active: true,
      });
      
      // Filter for Solana tokens
      const solanaTokens = tokens.filter(token => 
        token.chain.toLowerCase() === 'solana' || token.chain.toLowerCase() === 'sol'
      );
      
      if (solanaTokens.length === 0) {
        this.logger.warn('No active Solana tokens to ingest transactions for');
        return;
      }

      this.logger.log(`Processing Solana transactions for ${solanaTokens.length} tokens`);

      let totalTransactions = 0;

      // Process each Solana token
      for (const token of solanaTokens) {
        try {
          const transactions = await this.ingestSolanaTokenTransactions(
            token.id,
            token.contractAddress, // On Solana, this is the mint address
          );
          totalTransactions += transactions;
        } catch (error) {
          this.logger.error(
            `Failed to ingest Solana transactions for token ${token.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next token
        }
      }

      this.logger.log(`Solana transaction ingestion completed: ${totalTransactions} transactions stored`);
    } catch (error) {
      this.logger.error(`Solana transaction ingestion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ingest Solana transactions for a specific token
   */
  private async ingestSolanaTokenTransactions(
    tokenId: string,
    mintAddress: string,
  ): Promise<number> {
    this.logger.debug(`Ingesting Solana transactions for token ${tokenId} (mint: ${mintAddress})`);

    try {
      // Get recent token transfers from QuickNode
      const transfers = await this.integrationsService.quicknode.getRecentTokenTransactions(
        mintAddress,
        50, // Limit to 50 transfers per run
      );

      if (transfers.length === 0) {
        this.logger.debug(`No new Solana transfers found for token ${tokenId}`);
        return 0;
      }

      this.logger.debug(`Found ${transfers.length} Solana transfers for token ${tokenId}`);

      // Process and store transactions
      let transactionsStored = 0;
      for (const transfer of transfers) {
        try {
          const txStored = await this.processAndStoreSolanaTransaction(transfer, tokenId);
          if (txStored) {
            transactionsStored++;
          }
        } catch (error) {
          this.logger.warn(`Failed to store Solana transaction: ${error.message}`);
          // Continue with next transfer
        }
      }

      return transactionsStored;
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status;
      const isAuthError = statusCode === 403 || statusCode === 401;
      
      if (isAuthError) {
        this.logger.warn(
          `Skipping Solana transaction ingestion for token ${tokenId}: API authentication failed. ` +
          `Configure QUICKNODE_API_URL in .env to enable Solana ingestion.`,
        );
        return 0;
      }
      
      this.logger.error(
        `Failed to ingest Solana transactions for token ${tokenId}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Process and store a Solana transaction
   */
  private async processAndStoreSolanaTransaction(
    transfer: any,
    tokenId: string,
  ): Promise<boolean> {
    try {
      // Ensure wallets exist
      if (transfer.fromAddress) {
        try {
          const existing = await this.walletsService.findByAddress(transfer.fromAddress);
          if (!existing) {
            await this.walletsService.create({
              address: transfer.fromAddress,
              tracked: false,
            });
          }
        } catch (error) {
          this.logger.debug(`Wallet ${transfer.fromAddress} already exists or error: ${error.message}`);
        }
      }

      if (transfer.toAddress) {
        try {
          const existing = await this.walletsService.findByAddress(transfer.toAddress);
          if (!existing) {
            await this.walletsService.create({
              address: transfer.toAddress,
              tracked: false,
            });
          }
        } catch (error) {
          this.logger.debug(`Wallet ${transfer.toAddress} already exists or error: ${error.message}`);
        }
      }

      // Check if transaction already exists
      const existing = await this.prisma.transaction.findFirst({
        where: {
          tokenId,
          txHash: transfer.signature,
        },
      });

      if (existing) {
        this.logger.debug(`Solana transaction already exists: ${transfer.signature}`);
        return false;
      }

      // Store transaction
      // Note: Solana uses slots instead of block numbers, we'll use slot as blockNumber
      await this.transactionsService.create({
        txHash: transfer.signature,
        fromAddress: transfer.fromAddress,
        toAddress: transfer.toAddress,
        amount: transfer.amount,
        blockNumber: BigInt(transfer.slot),
        timestamp: new Date(transfer.blockTime * 1000),
        raw: {
          signature: transfer.signature,
          slot: transfer.slot,
          mint: transfer.mint,
          decimals: transfer.decimals,
          uiAmount: transfer.uiAmount,
          source: 'quicknode',
          chain: 'solana',
        },
        token: { connect: { id: tokenId } },
      } as any);

      return true;
    } catch (error: any) {
      // Skip if duplicate
      if (error.code === 'P2002') {
        this.logger.debug('Solana transaction already exists, skipping duplicate');
        return false;
      }
      throw error;
    }
  }

  /**
   * Map chain name to Moralis format
   */
  private mapChainToMoralis(chain: string): string {
    const mapping: Record<string, string> = {
      ethereum: 'eth',
      'binance-smart-chain': 'bsc',
      polygon: 'matic',
      avalanche: 'avalanche',
      fantom: 'fantom',
    };
    return mapping[chain.toLowerCase()] || chain.toLowerCase();
  }
}

