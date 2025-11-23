import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiUrl: string;
  private readonly provider: 'sendgrid' | 'mailgun' | null;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    // Check for SendGrid first (most common)
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    const mailgunKey = this.configService.get<string>('MAILGUN_API_KEY');
    const mailgunDomain = this.configService.get<string>('MAILGUN_DOMAIN');

    if (sendgridKey) {
      this.provider = 'sendgrid';
      this.apiKey = sendgridKey;
      this.apiUrl = 'https://api.sendgrid.com/v3';
      this.axiosInstance = axios.create({
        baseURL: this.apiUrl,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    } else if (mailgunKey && mailgunDomain) {
      this.provider = 'mailgun';
      this.apiKey = mailgunKey;
      this.apiUrl = `https://api.mailgun.net/v3/${mailgunDomain}`;
      this.axiosInstance = axios.create({
        baseURL: this.apiUrl,
        auth: {
          username: 'api',
          password: this.apiKey,
        },
        timeout: 10000,
      });
    } else {
      this.provider = null;
      this.apiKey = null;
      this.logger.warn('No email provider configured (SENDGRID_API_KEY or MAILGUN_API_KEY). Email notifications will be disabled.');
    }

    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@crypto-signals.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Crypto Signals';
  }

  /**
   * Check if email is configured
   */
  isConfigured(): boolean {
    return !!this.provider && !!this.apiKey;
  }

  /**
   * Send an email
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Email not configured, skipping email send');
      return false;
    }

    try {
      if (this.provider === 'sendgrid') {
        return await this.sendViaSendGrid(to, subject, htmlContent, textContent);
      } else if (this.provider === 'mailgun') {
        return await this.sendViaMailgun(to, subject, htmlContent, textContent);
      }
      return false;
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      content: [
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    };

    if (textContent) {
      payload.content.push({
        type: 'text/plain',
        value: textContent,
      });
    }

    const response = await this.axiosInstance.post('/mail/send', payload);

    if (response.status === 202) {
      this.logger.debug(`Email sent successfully via SendGrid to ${to}`);
      return true;
    }

    return false;
  }

  /**
   * Send email via Mailgun
   */
  private async sendViaMailgun(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    const formData = new URLSearchParams();
    formData.append('from', `${this.fromName} <${this.fromEmail}>`);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', htmlContent);
    if (textContent) {
      formData.append('text', textContent);
    }

    const response = await this.axiosInstance.post('/messages', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.status === 200) {
      this.logger.debug(`Email sent successfully via Mailgun to ${to}`);
      return true;
    }

    return false;
  }

  /**
   * Format an accumulation signal alert as HTML email
   */
  formatAlertEmail(signal: any, token: any, dashboardUrl?: string): { html: string; text: string } {
    const score = Number(signal.score).toFixed(2);
    const scoreColor = Number(signal.score) >= 75 ? '#dc2626' : Number(signal.score) >= 60 ? '#d97706' : '#16a34a';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .score { display: inline-block; padding: 8px 16px; background: ${scoreColor}; color: white; border-radius: 4px; font-weight: bold; font-size: 18px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Accumulation Signal Detected</h1>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Token:</span> ${token.symbol} (${token.name})
            </div>
            <div class="info-row">
              <span class="label">Chain:</span> ${token.chain}
            </div>
            <div class="info-row">
              <span class="label">Score:</span> <span class="score">${score}/100</span>
            </div>
            <div class="info-row">
              <span class="label">Type:</span> ${signal.signalType}
            </div>
            ${signal.metadata?.transactionCount ? `<div class="info-row"><span class="label">Transactions:</span> ${signal.metadata.transactionCount}</div>` : ''}
            ${signal.metadata?.totalVolume ? `<div class="info-row"><span class="label">Volume:</span> ${signal.metadata.totalVolume}</div>` : ''}
            ${dashboardUrl ? `<a href="${dashboardUrl}" class="button">View on Dashboard</a>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Accumulation Signal Detected

Token: ${token.symbol} (${token.name})
Chain: ${token.chain}
Score: ${score}/100
Type: ${signal.signalType}
${signal.metadata?.transactionCount ? `Transactions: ${signal.metadata.transactionCount}\n` : ''}
${signal.metadata?.totalVolume ? `Volume: ${signal.metadata.totalVolume}\n` : ''}
${dashboardUrl ? `View on Dashboard: ${dashboardUrl}` : ''}
    `.trim();

    return { html, text };
  }
}

