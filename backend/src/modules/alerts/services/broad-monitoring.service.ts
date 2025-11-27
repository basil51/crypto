import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BitqueryService } from '../../integrations/services/bitquery.service';
import { TokensService } from '../../tokens/tokens.service';
import { EnhancedAlertTriggerService } from './enhanced-alert-trigger.service';

interface ProcessedTransfer {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  contractAddress: string;
  transferType: 'BUY' | 'SELL';
  walletAddress: string;
  amount: number;
  transactionHash: string;
  timestamp: Date;
}

/**
 * Broad monitoring service that watches for whale activity across ALL tokens
 * without requiring specific token subscriptions
 */
@Injectable()
export class BroadMonitoringService {
  private readonly logger = new Logger(BroadMonitoringService.name);
  private readonly minTransferUSD = 100000; // $100k minimum
  private readonly knownExchanges = [
    '0x28c6c06298d514db089934071355e5743bf21d60', // Binance 14
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 15
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance 16
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', // Binance Hot Wallet
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance
    '0xd551234ae421e3bcba99a0da6d736074f22192ff', // Binance 2
    '0x564286362092d8e7936f0549571a803b203aaced', // Binance 3
    '0x0681d8db095565fe8a346fa0277bffde9c0edbbf', // Binance 4
    '0xfe9e8709d3215310075d67e3ed32a380ccf451c8', // Binance 5
    '0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67', // Binance 6
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', // Binance 7
    '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance 8
    '0x001866ae5b3de6caa5a51543fd9fb64f524f5478', // Binance 10
    '0x85b931a32a0725be14285b66f1a22178c672d69b', // Binance 11
    '0x708396f17127c42383e3b9014072679b2f60b82f', // Binance 12
    '0xe0f0cfde7ee664943906f17f7f14342e76a5cec7', // Binance 13
    '0x28c6c06298d514db089934071355e5743bf21d60', // Binance Hot Wallet 2
    '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', // Coinbase 1
    '0x77696bb39917c91a0c3908d577d5e322095425ca', // Coinbase 2
    '0x7c195d981abfdc3ddecd2ca0fed0958430488e34', // Coinbase 3
    '0x95a9bd206ae52c4ba8eecfc93d18eacdd41c88cc', // Coinbase 4
    '0xb739d0895772dbb71a89a3754a160269068f0d45', // Coinbase 5
    '0x503828976d22510aad0201ac7ec88293211d23da', // Coinbase 6
    '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740', // Coinbase 7
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', // Coinbase 8
    '0x46340b20830761efd32832a74d7169b29feb9758', // Coinbase 9
    '0xd688aea8f7d450909ade10c47faa95707ce0b252', // Coinbase 10
    '0x6b76f8b1e9e59913bfe758821887311ba1805cab', // Kraken
    '0xae2d4617c862309a3d75a0ffb358c7a5009c673f', // Kraken 2
    '0x43984d578803891dfa9706bdeee6078d80cfc79e', // Kraken 3
    '0x66c57bf505a85a74609d2c83e94aabb26d691e1f', // Kraken 4
    '0xda9dfa130df4de4673b89022ee50ff26f6ea73cf', // Kraken 5
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13', // Kraken 6
    '0xe853c56864a2ebe4576a807d26fdc4a0ada51919', // Kraken 7
    '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', // Kraken 8
  ].map((addr) => addr.toLowerCase());

  constructor(
    private prisma: PrismaService,
    private bitqueryService: BitqueryService,
    private tokensService: TokensService,
    private alertTriggerService: EnhancedAlertTriggerService,
  ) {}

  /**
   * Monitor all tokens for whale activity (main entry point)
   * This runs periodically to catch whale movements on any token
   */
  async monitorAllTokens(): Promise<{
    processed: number;
    alertsCreated: number;
    newTokensDiscovered: number;
  }> {
    this.logger.log('🔍 Starting broad token monitoring for whale activity...');

    if (!this.bitqueryService.isAvailable()) {
      this.logger.warn('Bitquery not configured, skipping broad monitoring');
      return { processed: 0, alertsCreated: 0, newTokensDiscovered: 0 };
    }

    let processed = 0;
    let alertsCreated = 0;
    let newTokensDiscovered = 0;

    try {
      // Fetch large transfers across all tokens (last hour)
      const networks = ['ethereum', 'bsc', 'matic'];
      
      for (const network of networks) {
        try {
          const transfers = await this.bitqueryService.getAllLargeTransfers(
            network,
            this.minTransferUSD,
            100, // Limit to 100 per network to avoid overwhelming the system
          );

          this.logger.log(`Found ${transfers.length} large transfers on ${network}`);

          // Process each transfer
          for (const transfer of transfers) {
            try {
              const result = await this.processTransfer(transfer, network);
              if (result) {
                processed++;
                if (result.alertCreated) alertsCreated++;
                if (result.newToken) newTokensDiscovered++;
              }
            } catch (error) {
              this.logger.error(`Failed to process transfer: ${error.message}`);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to fetch transfers for ${network}: ${error.message}`);
        }
      }

      this.logger.log(
        `✅ Broad monitoring completed: ${processed} transfers processed, ` +
        `${alertsCreated} alerts created, ${newTokensDiscovered} new tokens discovered`
      );
    } catch (error) {
      this.logger.error(`Failed to monitor all tokens: ${error.message}`, error.stack);
    }

    return { processed, alertsCreated, newTokensDiscovered };
  }

  /**
   * Process a single transfer and create alerts if needed
   */
  private async processTransfer(
    transfer: any,
    network: string,
  ): Promise<{ alertCreated: boolean; newToken: boolean } | null> {
    const tokenAddress = transfer.currency?.address;
    const tokenSymbol = transfer.currency?.symbol;
    const tokenName = transfer.currency?.name;

    if (!tokenAddress || !tokenSymbol) {
      return null;
    }

    // Normalize addresses
    const normalizedTokenAddress = tokenAddress.toLowerCase();
    const senderAddress = transfer.sender?.address?.toLowerCase();
    const receiverAddress = transfer.receiver?.address?.toLowerCase();

    // Skip if both sender and receiver are known exchanges (internal exchange transfers)
    if (
      this.knownExchanges.includes(senderAddress) &&
      this.knownExchanges.includes(receiverAddress)
    ) {
      return null;
    }

    // Map network to chain format
    const chain = this.mapNetworkToChain(network);

    // Check if token exists in database
    let token = await this.tokensService.findByAddress(chain, normalizedTokenAddress);
    let newToken = false;

    // If token doesn't exist, add it
    if (!token) {
      this.logger.log(
        `🆕 Discovered new token from whale activity: ${tokenSymbol} (${tokenName}) on ${chain}`
      );
      
      try {
        token = await this.prisma.token.create({
          data: {
            chain,
            symbol: tokenSymbol,
            name: tokenName || tokenSymbol,
            contractAddress: normalizedTokenAddress,
            decimals: 18, // Default, can be updated later
            active: true,
          },
        });
        newToken = true;
      } catch (error) {
        this.logger.error(`Failed to create token: ${error.message}`);
        return null;
      }
    }

    // Determine transfer type (buy/sell based on exchange involvement)
    let transferType: 'BUY' | 'SELL' | null = null;
    let relevantWallet: string | null = null;

    if (this.knownExchanges.includes(senderAddress)) {
      // Withdrawal from exchange = BUY
      transferType = 'BUY';
      relevantWallet = receiverAddress;
    } else if (this.knownExchanges.includes(receiverAddress)) {
      // Deposit to exchange = SELL (or preparing to sell)
      transferType = 'SELL';
      relevantWallet = senderAddress;
    } else {
      // Wallet to wallet transfer - consider it a buy by the receiver
      transferType = 'BUY';
      relevantWallet = receiverAddress;
    }

    // Create alerts based on transfer type
    let alertCreated = false;

    if (transferType === 'BUY' && relevantWallet) {
      await this.alertTriggerService.triggerWhaleBuyAlert(
        token.id,
        relevantWallet,
        transfer.amount,
        {
          transactionHash: transfer.transaction?.hash,
          timestamp: transfer.transaction?.block?.timestamp?.time,
          tokenSymbol,
          tokenName,
          chain,
          source: 'broad_monitoring',
        },
      );
      alertCreated = true;
      this.logger.log(
        `🐋 Created whale BUY alert: ${tokenSymbol} - $${transfer.amount.toLocaleString()}`
      );
    } else if (transferType === 'SELL' && relevantWallet) {
      await this.alertTriggerService.triggerWhaleSellAlert(
        token.id,
        relevantWallet,
        transfer.amount,
        {
          transactionHash: transfer.transaction?.hash,
          timestamp: transfer.transaction?.block?.timestamp?.time,
          tokenSymbol,
          tokenName,
          chain,
          source: 'broad_monitoring',
        },
      );
      alertCreated = true;
      this.logger.log(
        `🐋 Created whale SELL alert: ${tokenSymbol} - $${transfer.amount.toLocaleString()}`
      );
    }

    // If transfer involves an exchange, also trigger exchange deposit/withdrawal alert
    if (this.knownExchanges.includes(receiverAddress)) {
      const exchangeName = this.identifyExchange(receiverAddress);
      await this.alertTriggerService.triggerExchangeDepositAlert(
        token.id,
        exchangeName,
        transfer.amount,
        {
          transactionHash: transfer.transaction?.hash,
          timestamp: transfer.transaction?.block?.timestamp?.time,
          tokenSymbol,
          tokenName,
          chain,
          source: 'broad_monitoring',
        },
      );
      alertCreated = true;
      this.logger.log(
        `🏦 Created exchange DEPOSIT alert: ${tokenSymbol} to ${exchangeName}`
      );
    } else if (this.knownExchanges.includes(senderAddress)) {
      const exchangeName = this.identifyExchange(senderAddress);
      await this.alertTriggerService.triggerExchangeWithdrawalAlert(
        token.id,
        exchangeName,
        transfer.amount,
        {
          transactionHash: transfer.transaction?.hash,
          timestamp: transfer.transaction?.block?.timestamp?.time,
          tokenSymbol,
          tokenName,
          chain,
          source: 'broad_monitoring',
        },
      );
      alertCreated = true;
      this.logger.log(
        `🏦 Created exchange WITHDRAWAL alert: ${tokenSymbol} from ${exchangeName}`
      );
    }

    return { alertCreated, newToken };
  }

  /**
   * Map Bitquery network name to our chain format
   */
  private mapNetworkToChain(network: string): string {
    const mapping: Record<string, string> = {
      ethereum: 'ethereum',
      bsc: 'bsc',
      matic: 'polygon',
      polygon: 'polygon',
    };
    return mapping[network] || network;
  }

  /**
   * Identify exchange from wallet address
   */
  private identifyExchange(address: string): string {
    const normalizedAddress = address.toLowerCase();
    
    if (normalizedAddress.startsWith('0x28c6c06') || 
        normalizedAddress.startsWith('0x21a31ee') ||
        normalizedAddress.startsWith('0xdfd5293') ||
        normalizedAddress.startsWith('0x56eddb7') ||
        normalizedAddress.startsWith('0x3f5ce5f') ||
        normalizedAddress.startsWith('0xd551234') ||
        normalizedAddress.startsWith('0x564286') ||
        normalizedAddress.startsWith('0x0681d8d') ||
        normalizedAddress.startsWith('0xfe9e870') ||
        normalizedAddress.startsWith('0x4e9ce36') ||
        normalizedAddress.startsWith('0xbe0eb53') ||
        normalizedAddress.startsWith('0xf977814') ||
        normalizedAddress.startsWith('0x001866a') ||
        normalizedAddress.startsWith('0x85b931a') ||
        normalizedAddress.startsWith('0x708396f') ||
        normalizedAddress.startsWith('0xe0f0cfd')) {
      return 'Binance';
    }
    
    if (normalizedAddress.startsWith('0xa9d1e08') ||
        normalizedAddress.startsWith('0x77696bb') ||
        normalizedAddress.startsWith('0x7c195d9') ||
        normalizedAddress.startsWith('0x95a9bd2') ||
        normalizedAddress.startsWith('0xb739d08') ||
        normalizedAddress.startsWith('0x503828') ||
        normalizedAddress.startsWith('0xddfabcd') ||
        normalizedAddress.startsWith('0x71660c4') ||
        normalizedAddress.startsWith('0x46340b2') ||
        normalizedAddress.startsWith('0xd688aea')) {
      return 'Coinbase';
    }
    
    if (normalizedAddress.startsWith('0x6b76f8b') ||
        normalizedAddress.startsWith('0xae2d461') ||
        normalizedAddress.startsWith('0x43984d5') ||
        normalizedAddress.startsWith('0x66c57bf') ||
        normalizedAddress.startsWith('0xda9dfa1') ||
        normalizedAddress.startsWith('0x0a869d7') ||
        normalizedAddress.startsWith('0xe853c56') ||
        normalizedAddress.startsWith('0x267be1c')) {
      return 'Kraken';
    }
    
    return 'Unknown Exchange';
  }
}

