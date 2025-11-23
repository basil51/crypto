import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private isInitialized = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV') || 'development';

    if (!dsn) {
      // Only log in development, suppress in production if not needed
      if (environment === 'development') {
        this.logger.debug('SENTRY_DSN not configured. Sentry monitoring is disabled. (This is optional)');
      }
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        integrations: [
          nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
        // Profiling
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
        // Release tracking
        release: this.configService.get<string>('SENTRY_RELEASE') || undefined,
        // Filter out health checks and other noise
        beforeSend(event, hint) {
          // Don't send health check errors
          if (event.request?.url?.includes('/health')) {
            return null;
          }
          return event;
        },
      });

      this.isInitialized = true;
      this.logger.log('Sentry initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', error);
    }
  }

  /**
   * Capture exception
   */
  captureException(exception: any, context?: any) {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(exception);
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any) {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Start a span for performance monitoring
   * Returns a transaction-like object for compatibility
   */
  startTransaction(name: string, op: string): any {
    if (!this.isInitialized) return null;

    // Create a simple transaction wrapper
    // Sentry will automatically track spans when using startSpan
    return {
      setHttpStatus: (status: number) => {
        Sentry.setTag('http.status_code', status.toString());
      },
      setTag: (key: string, value: string) => {
        Sentry.setTag(key, value);
      },
      finish: () => {
        // Transaction tracking is handled automatically by Sentry
        // This is a no-op for compatibility with the interceptor
      },
    };
  }

  /**
   * Start a span for detailed performance tracking
   */
  startSpan<T>(name: string, op: string, callback: () => T): T {
    if (!this.isInitialized) return callback();

    return Sentry.startSpan(
      {
        name,
        op,
      },
      callback,
    );
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; role?: string }) {
    if (!this.isInitialized) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (!this.isInitialized) return;
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    if (!this.isInitialized) return;
    Sentry.addBreadcrumb(breadcrumb);
  }
}

