/**
 * Periodic Osmium - Cache Service Tests
 */

import { CacheService } from '../src/core/cache';
import { createRedisClient } from '../src/core/redis';

describe('CacheService', () => {
  let redis: any;
  let cache: CacheService;

  beforeAll(() => {
    redis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  });

  beforeEach(() => {
    cache = new CacheService(redis, 'test', 60);
  });

  afterEach(async () => {
    // Clean up test data
    await cache.delPattern('*');
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('Basic Operations', () => {
    test('should set and get cache value', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      await cache.set(key, value);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    test('should return null for non-existent key', async () => {
      const result = await cache.get('non:existent:key');
      expect(result).toBeNull();
    });

    test('should delete cache value', async () => {
      const key = 'test:delete';
      await cache.set(key, 'value');

      const deleted = await cache.del(key);
      expect(deleted).toBe(true);

      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    test('should check if key exists', async () => {
      const key = 'test:exists';
      await cache.set(key, 'value');

      const exists = await cache.exists(key);
      expect(exists).toBe(true);

      await cache.del(key);
      const notExists = await cache.exists(key);
      expect(notExists).toBe(false);
    });
  });

  describe('TTL Management', () => {
    test('should set custom TTL', async () => {
      const key = 'test:ttl';
      await cache.set(key, 'value', 10); // 10 seconds

      const ttl = await cache.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    test('should expire after TTL', async () => {
      const key = 'test:expire';
      await cache.set(key, 'value', 1); // 1 second

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await cache.get(key);
      expect(result).toBeNull();
    });
  });

  describe('Tag-Based Operations', () => {
    test('should invalidate by tags', async () => {
      const key1 = 'user:1';
      const key2 = 'user:2';
      const tag = 'users';

      await cache.set(key1, { id: 1 }, 60, [tag]);
      await cache.set(key2, { id: 2 }, 60, [tag]);

      const deleted = await cache.invalidateByTags([tag]);
      expect(deleted).toBeGreaterThan(0);

      const result1 = await cache.get(key1);
      const result2 = await cache.get(key2);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    test('should invalidate multiple tags', async () => {
      await cache.set('key1', 'value1', 60, ['tag1']);
      await cache.set('key2', 'value2', 60, ['tag2']);
      await cache.set('key3', 'value3', 60, ['tag1', 'tag2']);

      await cache.invalidateByTags(['tag1', 'tag2']);

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('Pattern-Based Operations', () => {
    test('should delete by pattern', async () => {
      await cache.set('list:page:1', 'data1');
      await cache.set('list:page:2', 'data2');
      await cache.set('search:query', 'data3');

      const deleted = await cache.delPattern('list:*');
      expect(deleted).toBe(2);

      expect(await cache.get('list:page:1')).toBeNull();
      expect(await cache.get('list:page:2')).toBeNull();
      expect(await cache.get('search:query')).not.toBeNull();
    });
  });

  describe('Cache-Aside Pattern', () => {
    test('should use getOrSet for cache-aside', async () => {
      const key = 'test:getOrSet';
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount++;
        return { data: 'fetched' };
      };

      // First call - should fetch
      const result1 = await cache.getOrSet(key, fetcher, 60);
      expect(result1).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1);

      // Second call - should use cache
      const result2 = await cache.getOrSet(key, fetcher, 60);
      expect(result2).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1); // Not incremented
    });
  });

  describe('Counter Operations', () => {
    test('should increment counter', async () => {
      const key = 'test:counter';

      const val1 = await cache.incr(key);
      expect(val1).toBe(1);

      const val2 = await cache.incr(key);
      expect(val2).toBe(2);

      const val3 = await cache.incr(key);
      expect(val3).toBe(3);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const healthy = await cache.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Compression', () => {
    test('should compress large values', async () => {
      const key = 'test:large';
      const largeValue = { data: 'x'.repeat(2000) }; // > 1KB

      await cache.set(key, largeValue);
      const result = await cache.get(key);

      expect(result).toEqual(largeValue);
    });
  });

  describe('Namespace Isolation', () => {
    test('should isolate namespaces', async () => {
      const cache1 = new CacheService(redis, 'namespace1');
      const cache2 = new CacheService(redis, 'namespace2');

      await cache1.set('key', 'value1');
      await cache2.set('key', 'value2');

      expect(await cache1.get('key')).toBe('value1');
      expect(await cache2.get('key')).toBe('value2');

      await cache1.delPattern('*');
      await cache2.delPattern('*');
    });
  });
});
