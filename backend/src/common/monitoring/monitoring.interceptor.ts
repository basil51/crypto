import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SentryService } from './sentry.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(
    @Inject(SentryService) private readonly sentryService: SentryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    // Start Sentry span for performance monitoring
    let transaction: any = null;
    if (this.sentryService) {
      transaction = this.sentryService.startTransaction(
        `${method} ${url}`,
        'http.server',
      );
    }

    // Set user context if available
    if (this.sentryService && request.user) {
      this.sentryService.setUser({
        id: request.user.userId,
        email: request.user.email,
        role: request.user.role,
      });
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          
          // Log slow requests
          if (this.sentryService && duration > 1000) {
            this.sentryService.addBreadcrumb({
              category: 'performance',
              message: `Slow request: ${method} ${url} took ${duration}ms`,
              level: 'warning',
              data: {
                method,
                url,
                duration,
              },
            });
          }

          // Finish transaction
          if (transaction) {
            transaction.setHttpStatus(200);
            transaction.finish();
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          // Finish transaction with error status
          if (transaction) {
            transaction.setHttpStatus(error.status || 500);
            transaction.setTag('error', true);
            transaction.finish();
          }

          // Add breadcrumb for error
          if (this.sentryService) {
            this.sentryService.addBreadcrumb({
            category: 'error',
            message: `Request failed: ${method} ${url}`,
            level: 'error',
            data: {
              method,
              url,
              duration,
              error: error.message,
            },
          });
          }
        },
      }),
    );
  }
}

