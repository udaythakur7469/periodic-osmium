/**
 * Periodic Osmium - Production-grade Redis Caching Middleware
 *
 * Part of the Periodic series of Node.js middleware packages
 *
 * Features:
 * - Auto-caching for GET requests
 * - Tag-based cache invalidation
 * - Pattern-based cache clearing
 * - Redis Cluster support
 * - User-specific caching
 * - Non-blocking operations
 *
 * @packageDocumentation
 */

// Core exports
export { CacheService } from './core/cache';
export { createRedisClient, checkRedisHealth } from './core/redis';

// Adapter exports
export { cacheMiddleware } from './adapters/express';

// Type exports
export type {
  CacheStrategy,
  AutoCacheConfig,
  InvalidationConfig,
  CacheConfig,
  RedisConfig,
  ICacheService,
} from './core/types';

// Re-export Redis types for convenience
export type { Redis, Cluster } from 'ioredis';
