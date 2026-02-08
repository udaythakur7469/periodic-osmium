import { Redis, Cluster } from 'ioredis';
import { ICacheService } from './types';

/**
 * Cache service providing Redis operations with namespacing, compression, and tagging
 *
 * Features:
 * - Automatic key namespacing to avoid collisions
 * - Data compression for large values
 * - Tag-based cache invalidation
 * - Pattern-based deletion with SCAN (non-blocking)
 * - TTL management
 * - Health checks
 */
export class CacheService implements ICacheService {
  private redis: Redis | Cluster;
  private defaultTTL: number;
  private namespace: string;
  private compressionThreshold: number;

  /**
   * Create a new CacheService instance
   *
   * @param redisClient - Redis or Cluster instance
   * @param namespace - Cache namespace for key isolation (default: 'app')
   * @param defaultTTL - Default time to live in seconds (default: 3600)
   */
  constructor(redisClient: Redis | Cluster, namespace: string = 'app', defaultTTL: number = 3600) {
    this.redis = redisClient;
    this.defaultTTL = defaultTTL;
    this.namespace = namespace;
    this.compressionThreshold = 1024; // Compress data larger than 1KB
  }

  /**
   * Generate namespaced cache key
   * @private
   */
  private generateKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespace;
    return `${ns}:${key}`;
  }

  /**
   * Compress data if it exceeds threshold
   * Uses base64 encoding for simplicity
   * @private
   */
  private compress(data: string): string {
    if (data.length > this.compressionThreshold) {
      return `compressed:${Buffer.from(data).toString('base64')}`;
    }
    return data;
  }

  /**
   * Decompress data if it was compressed
   * @private
   */
  private decompress(data: string): string {
    if (data.startsWith('compressed:')) {
      return Buffer.from(data.slice(11), 'base64').toString('utf-8');
    }
    return data;
  }

  /**
   * Get cached value by key
   *
   * @param key - Cache key
   * @param namespace - Optional namespace override
   * @returns Cached value or null if not found
   */
  async get(key: string, namespace?: string): Promise<any> {
    const fullKey = this.generateKey(key, namespace);
    try {
      const data = await this.redis.get(fullKey);
      if (data) {
        const decompressed = this.decompress(data);
        return JSON.parse(decompressed);
      }
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${fullKey}:`, error);
      return null;
    }
  }

  /**
   * Set cache value with optional TTL and tags
   *
   * @param key - Cache key
   * @param value - Value to cache (will be JSON serialized)
   * @param ttl - Time to live in seconds (optional)
   * @param tags - Tags for invalidation (optional)
   * @returns Success status
   */
  async set(key: string, value: any, ttl?: number, tags?: string[]): Promise<boolean> {
    const fullKey = this.generateKey(key);
    const expiry = ttl || this.defaultTTL;

    try {
      const serialized = JSON.stringify(value);
      const data = this.compress(serialized);

      const pipeline = this.redis.pipeline();
      pipeline.setex(fullKey, expiry, data);

      // Associate cache key with tags for invalidation
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          const tagKey = this.generateKey(`tag:${tag}`);
          pipeline.sadd(tagKey, fullKey);
          pipeline.expire(tagKey, expiry);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value by key
   *
   * @param key - Cache key
   * @param namespace - Optional namespace override
   * @returns Success status
   */
  async del(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.generateKey(key, namespace);
    try {
      await this.redis.del(fullKey);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all cache entries associated with given tags
   *
   * @param tags - Array of tags to invalidate
   * @returns Number of cache entries deleted
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = this.generateKey(`tag:${tag}`);
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();

          // Delete all keys associated with this tag
          for (const key of keys) {
            pipeline.del(key);
          }

          // Delete the tag set itself
          pipeline.del(tagKey);

          await pipeline.exec();
          totalDeleted += keys.length;
        }
      }

      return totalDeleted;
    } catch (error) {
      console.error('Cache invalidation by tags error:', error);
      return 0;
    }
  }

  /**
   * Delete all keys matching a pattern using SCAN (non-blocking)
   *
   * @param pattern - Pattern to match (supports wildcards, e.g., 'list:*')
   * @returns Number of keys deleted
   */
  async delPattern(pattern: string): Promise<number> {
    const fullPattern = this.generateKey(pattern);
    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      // Use SCAN to find all matching keys (non-blocking)
      do {
        const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
        cursor = newCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      // Delete keys in batches
      if (keysToDelete.length > 0) {
        const batchSize = 100;
        let totalDeleted = 0;

        for (let i = 0; i < keysToDelete.length; i += batchSize) {
          const batch = keysToDelete.slice(i, i + batchSize);
          await this.redis.del(...batch);
          totalDeleted += batch.length;
        }

        return totalDeleted;
      }

      return 0;
    } catch (error) {
      console.error('Cache pattern deletion error:', error);
      return 0;
    }
  }

  /**
   * Get cached value or set it using a fetcher function
   *
   * @param key - Cache key
   * @param fetcher - Function to fetch data if cache miss
   * @param ttl - Time to live in seconds (optional)
   * @param tags - Tags for invalidation (optional)
   * @returns Cached or fetched value
   */
  async getOrSet(
    key: string,
    fetcher: () => Promise<any>,
    ttl?: number,
    tags?: string[]
  ): Promise<any> {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Cache miss - fetch data
      const data = await fetcher();

      // Store in cache
      await this.set(key, data, ttl, tags);

      return data;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error);
      // On error, just fetch the data
      return await fetcher();
    }
  }

  /**
   * Check if a key exists in cache
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.generateKey(key);
    try {
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get TTL (time to live) for a key
   *
   * @param key - Cache key
   * @returns TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    const fullKey = this.generateKey(key);
    try {
      return await this.redis.ttl(fullKey);
    } catch (error) {
      return -1;
    }
  }

  /**
   * Increment a counter
   *
   * @param key - Cache key
   * @returns New value after increment
   */
  async incr(key: string): Promise<number> {
    const fullKey = this.generateKey(key);
    try {
      return await this.redis.incr(fullKey);
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }

  /**
   * Check Redis connection health
   *
   * @returns True if Redis is responsive
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}
