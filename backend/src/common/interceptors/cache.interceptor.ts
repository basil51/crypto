import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../cache/cache.service';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';

/**
 * Decorator to enable caching on an endpoint
 * @param key - Cache key (can include :paramName for dynamic values)
 * @param ttl - Time to live in seconds (default: 300)
 */
export const Cache = (key: string, ttl: number = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY, key, descriptor.value);
    Reflect.defineMetadata(CACHE_TTL, ttl, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Check if caching is enabled for this endpoint
    const cacheKey = this.reflector.get<string>(CACHE_KEY, handler);
    const cacheTtl = this.reflector.get<number>(CACHE_TTL, handler);

    if (!cacheKey || !this.cacheService.isAvailable()) {
      return next.handle();
    }

    // Build cache key with route params
    let finalKey = cacheKey;
    if (request.params) {
      Object.keys(request.params).forEach((key) => {
        finalKey = finalKey.replace(`:${key}`, request.params[key]);
      });
    }

    // Add query params to cache key for GET requests
    if (request.method === 'GET' && request.query && Object.keys(request.query).length > 0) {
      const queryString = new URLSearchParams(request.query).toString();
      finalKey = `${finalKey}:${Buffer.from(queryString).toString('base64')}`;
    }

    // Try to get from cache
    const cached = await this.cacheService.get(finalKey);
    if (cached !== null) {
      return of(cached);
    }

    // If not cached, execute handler and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheService.set(finalKey, data, cacheTtl);
      }),
    );
  }
}

