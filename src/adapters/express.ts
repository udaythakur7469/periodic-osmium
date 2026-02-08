import { Request, Response, NextFunction } from 'express';
import { Redis, Cluster } from 'ioredis';
import crypto from 'crypto';
import { CacheService } from '../core/cache';
import { CacheConfig } from '../core/types';

/**
 * Unified cache middleware for Express
 *
 * Supports:
 * - Auto-caching for GET requests
 * - Tag-based invalidation for mutations
 * - Pattern-based invalidation
 * - User-specific caching
 * - Non-blocking invalidation
 * - Manual cache control
 *
 * @param redisClient - Redis or Cluster instance
 * @param config - Cache configuration options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // Auto-cache GET requests
 * app.get('/users',
 *   cacheMiddleware(redis, {
 *     ttl: 300,
 *     autoCache: { tags: ['users'] }
 *   }),
 *   getUsersController
 * );
 *
 * // Invalidate on mutation
 * app.post('/users',
 *   cacheMiddleware(redis, {
 *     invalidate: {
 *       tags: ['users'],
 *       patterns: ['list:*']
 *     }
 *   }),
 *   createUserController
 * );
 * ```
 */
export function cacheMiddleware(redisClient: Redis | Cluster, config: CacheConfig = {}) {
  const {
    strategy = 'auto',
    ttl = 3600,
    namespace = 'app',
    autoCache = {},
    invalidate = {},
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Always attach cache service to request
    req.cache = new CacheService(redisClient, namespace, ttl);

    // If strategy is 'none' or 'manual', just attach service and continue
    if (strategy === 'none' || strategy === 'manual') {
      return next();
    }

    const isGetRequest = req.method === 'GET';
    const isMutationRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

    // =========================================================
    // AUTO-CACHE for GET requests
    // =========================================================

    if (isGetRequest && autoCache.enabled !== false) {
      const shouldCache = autoCache.condition ? autoCache.condition(req) : true;

      if (shouldCache) {
        // Generate cache key
        const generateKey =
          autoCache.keyGenerator ||
          ((req: Request) => {
            const parts: string[] = [req.method, req.path];

            // Add query params hash
            const queryString = Object.keys(req.query)
              .sort()
              .map((key) => `${key}=${req.query[key]}`)
              .join('&');

            if (queryString) {
              parts.push(crypto.createHash('md5').update(queryString).digest('hex'));
            }

            // Add user ID if required
            if (autoCache.includeAuth && (req as any).user?.id) {
              parts.push(`user:${(req as any).user.id}`);
            }

            return parts.join(':');
          });

        const cacheKey = generateKey(req);
        req.cacheKey = cacheKey;

        try {
          // Check cache
          const cachedData = await req.cache.get(cacheKey);

          if (cachedData !== null) {
            // Cache HIT - return cached data immediately
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('X-Cache-Key', cacheKey);
            return res.json(cachedData);
          }

          // Cache MISS - continue to controller
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);

          // Override json method to cache response
          const originalJson = res.json.bind(res);

          res.json = function (data: any) {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const tags =
                typeof autoCache.tags === 'function' ? autoCache.tags(req) : autoCache.tags || [];

              // Cache asynchronously (non-blocking)
              req.cache
                .set(cacheKey, data, ttl, tags)
                .catch((err) => console.error('Cache set error:', err));
            }
            return originalJson(data);
          };

          return next();
        } catch (error) {
          console.error('Auto-cache error:', error);
          res.setHeader('X-Cache', 'ERROR');
          return next();
        }
      }
    }

    // =========================================================
    // INVALIDATION for Mutation requests
    // =========================================================

    if (isMutationRequest && invalidate.enabled !== false) {
      const performInvalidation = async (data?: any) => {
        try {
          const promises: Promise<any>[] = [];

          // Invalidate by tags
          if (invalidate.tags) {
            const tags =
              typeof invalidate.tags === 'function'
                ? invalidate.tags(req, res, data)
                : invalidate.tags;

            if (tags.length > 0) {
              promises.push(req.cache.invalidateByTags(tags));
            }
          }

          // Invalidate by patterns
          if (invalidate.patterns) {
            const patterns =
              typeof invalidate.patterns === 'function'
                ? invalidate.patterns(req, res, data)
                : invalidate.patterns;

            for (const pattern of patterns) {
              promises.push(req.cache.delPattern(pattern));
            }
          }

          // Invalidate by specific keys
          if (invalidate.keys) {
            const keys =
              typeof invalidate.keys === 'function'
                ? invalidate.keys(req, res, data)
                : invalidate.keys;

            for (const key of keys) {
              promises.push(req.cache.del(key));
            }
          }

          await Promise.all(promises);
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      };

      if (invalidate.afterResponse) {
        // Invalidate after response is sent (non-blocking)
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = function (data: any) {
          const result = originalJson(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(() => performInvalidation(data));
          }
          return result;
        };

        res.send = function (data: any) {
          const result = originalSend(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(() => performInvalidation(data));
          }
          return result;
        };
      } else {
        // Invalidate after response finishes
        res.on('finish', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            performInvalidation();
          }
        });
      }
    }

    next();
  };
}
