import { Request, Response } from 'express';

/**
 * Cache strategy options
 * - auto: Automatic caching for GET requests and invalidation for mutations
 * - manual: Controller handles caching manually using req.cache
 * - none: Caching disabled, only attaches cache service to request
 */
export type CacheStrategy = 'auto' | 'manual' | 'none';

/**
 * Auto-cache configuration for GET requests
 */
export interface AutoCacheConfig {
  /**
   * Enable auto-caching for GET requests
   * @default true
   */
  enabled?: boolean;

  /**
   * Custom cache key generator function
   * @param req - Express request object
   * @returns Cache key string
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Tags to associate with cached entries for invalidation
   * Can be static array or dynamic function
   */
  tags?: string[] | ((req: Request) => string[]);

  /**
   * Include authenticated user ID in cache key
   * Useful for user-specific caching
   * @default false
   */
  includeAuth?: boolean;

  /**
   * Condition to determine if request should be cached
   * @param req - Express request object
   * @returns true to cache, false to skip
   */
  condition?: (req: Request) => boolean;
}

/**
 * Cache invalidation configuration for POST/PUT/DELETE requests
 */
export interface InvalidationConfig {
  /**
   * Enable cache invalidation
   * @default true
   */
  enabled?: boolean;

  /**
   * Tags to invalidate
   * All cache entries with these tags will be deleted
   */
  tags?: string[] | ((req: Request, res: Response, data?: any) => string[]);

  /**
   * Patterns to match for invalidation (supports wildcards)
   * Example: ['list:*', 'search:*']
   */
  patterns?: string[] | ((req: Request, res: Response, data?: any) => string[]);

  /**
   * Specific cache keys to invalidate
   */
  keys?: string[] | ((req: Request, res: Response, data?: any) => string[]);

  /**
   * Perform invalidation after response is sent (non-blocking)
   * Improves response latency
   * @default false
   */
  afterResponse?: boolean;
}

/**
 * Main cache middleware configuration
 */
export interface CacheConfig {
  /**
   * Cache strategy
   * @default 'auto'
   */
  strategy?: CacheStrategy;

  /**
   * Time to live in seconds
   * @default 3600 (1 hour)
   */
  ttl?: number;

  /**
   * Cache namespace to avoid key collisions
   * @default 'app'
   */
  namespace?: string;

  /**
   * Auto-cache configuration for GET requests
   */
  autoCache?: AutoCacheConfig;

  /**
   * Invalidation configuration for mutations
   */
  invalidate?: InvalidationConfig;
}

/**
 * Redis configuration for client creation
 */
export interface RedisConfig {
  /** Redis connection URL (e.g., redis://user:pass@host:port) */
  url?: string;
  /**
   * Redis host
   * @default 'localhost'
   */
  host?: string;

  /**
   * Redis port
   * @default 6379
   */
  port?: number;

  /**
   * Redis password
   */
  password?: string;

  /** Redis username (for ACL) */
  username?: string;

  /**
   * Redis cluster nodes (format: 'host:port,host:port')
   * If provided, Redis Cluster will be used instead of standalone
   */
  clusterNodes?: string[];

  /**
   * Enable production mode (uses cluster if clusterNodes provided)
   * @default false
   */
  isProduction?: boolean;

  /**
   * Maximum retries per request
   * @default 3
   */
  maxRetriesPerRequest?: number;

  /**
   * Enable lazy connection
   * @default false
   */
  lazyConnect?: boolean;
}

/**
 * Cache service interface
 */
export interface ICacheService {
  get(key: string, namespace?: string): Promise<any>;
  set(key: string, value: any, ttl?: number, tags?: string[]): Promise<boolean>;
  del(key: string, namespace?: string): Promise<boolean>;
  invalidateByTags(tags: string[]): Promise<number>;
  delPattern(pattern: string): Promise<number>;
  getOrSet(key: string, fetcher: () => Promise<any>, ttl?: number, tags?: string[]): Promise<any>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  healthCheck(): Promise<boolean>;
}

/**
 * Extend Express Request with cache service
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Cache service instance attached to request
       */
      cache: ICacheService;

      /**
       * Current request's cache key (set by auto-cache)
       */
      cacheKey?: string;
    }
  }
}
