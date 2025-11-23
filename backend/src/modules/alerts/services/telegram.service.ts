import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | null;
  private readonly apiUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || null;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
    });

    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured. Telegram notifications will be disabled.');
    }
  }

  /**
   * Check if Telegram is configured
   */
  isConfigured(): boolean {
    return !!this.botToken;
  }

  /**
   * Send a message to a Telegram chat
   * @param chatId - Telegram chat ID (user ID or channel ID)
   * @param message - Message text
   * @param parseMode - Optional parse mode (HTML or Markdown)
   */
  async sendMessage(
    chatId: string,
    message: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Telegram not configured, skipping message send');
      return false;
    }

    try {
      const response = await this.axiosInstance.post('/sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      });

      if (response.data.ok) {
        this.logger.debug(`Telegram message sent successfully to chat ${chatId}`);
        return true;
      } else {
        this.logger.error(`Telegram API error: ${response.data.description}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send Telegram message: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Format an accumulation signal alert for Telegram
   */
  formatAlertMessage(signal: any, token: any, dashboardUrl?: string): string {
    const score = Number(signal.score).toFixed(2);
    const scoreEmoji = Number(signal.score) >= 75 ? '🚨' : Number(signal.score) >= 60 ? '⚠️' : '📊';
    
    let message = `${scoreEmoji} <b>Accumulation Signal Detected</b>\n\n`;
    message += `<b>Token:</b> ${token.symbol} (${token.name})\n`;
    message += `<b>Chain:</b> ${token.chain}\n`;
    message += `<b>Score:</b> ${score}/100\n`;
    message += `<b>Type:</b> ${signal.signalType}\n`;
    
    if (signal.metadata?.transactionCount) {
      message += `<b>Transactions:</b> ${signal.metadata.transactionCount}\n`;
    }
    
    if (signal.metadata?.totalVolume) {
      message += `<b>Volume:</b> ${signal.metadata.totalVolume}\n`;
    }

    if (dashboardUrl) {
      message += `\n<a href="${dashboardUrl}">View on Dashboard →</a>`;
    }

    return message;
  }
}

