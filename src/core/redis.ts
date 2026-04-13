import { Redis, Cluster } from 'ioredis';
import { RedisConfig } from './types';

/**
 * Configuration for Redis Cluster
 */
export interface ClusterConfig extends RedisConfig {
  clusterNodes: string[];
  isProduction: true;
}

/**
 * Configuration for standalone Redis
 */
export interface StandaloneConfig extends RedisConfig {
  clusterNodes?: never;
  isProduction?: false;
}

/**
 * Create and configure a Redis Cluster client
 *
 * @param config - Redis Cluster configuration with clusterNodes and isProduction: true
 * @returns Configured Cluster instance
 */
export function createRedisClient(config: ClusterConfig): Cluster;

/**
 * Create and configure a standalone Redis client
 *
 * @param config - Redis configuration without cluster settings
 * @returns Configured Redis instance
 */
export function createRedisClient(config?: StandaloneConfig): Redis;

/**
 * Create and configure a Redis client
 * Supports both standalone Redis and Redis Cluster
 *
 * @param config - Redis configuration options
 * @returns Configured Redis or Cluster instance
 *
 * @example
 * ```typescript
 * // Standalone Redis - returns Redis type
 * const redis = createRedisClient({
 *   host: 'localhost',
 *   port: 6379
 * });
 *
 * // Redis Cluster - returns Cluster type
 * const cluster = createRedisClient({
 *   clusterNodes: ['node1:6379', 'node2:6379'],
 *   isProduction: true
 * });
 * ```
 */
export function createRedisClient(config: RedisConfig = {}): Redis | Cluster {
  const {
    url,
    host = 'localhost',
    port = 6379,
    password,
    username,
    clusterNodes,
    isProduction = false,
    maxRetriesPerRequest = 3,
    lazyConnect = false,
  } = config;

  // Use Redis Cluster if in production and cluster nodes are provided
  const shouldUseCluster = isProduction && clusterNodes && clusterNodes.length > 0;

  let client: Redis | Cluster;

  if (shouldUseCluster) {
    // Redis Cluster setup
    const nodes = clusterNodes!.map((node) => {
      const [nodeHost, nodePort] = node.split(':');
      return {
        host: nodeHost,
        port: parseInt(nodePort, 10),
      };
    });

    client = new Cluster(nodes, {
      redisOptions: {
        password,
        username,
        enableReadyCheck: true,
        maxRetriesPerRequest,
        lazyConnect,
      },
      clusterRetryStrategy: (times) => {
        // Exponential backoff with max 2 seconds
        return Math.min(times * 50, 2000);
      },
    });

    console.log('🔄 Redis Cluster initialized with', nodes.length, 'nodes');
  } else if (url) {
    // URL-based connection (supports Redis Cloud URLs)
    client = new Redis(url, {
      maxRetriesPerRequest,
      enableReadyCheck: true,
      lazyConnect,
      retryStrategy: (times) => {
        // Exponential backoff with max 2 seconds
        return Math.min(times * 50, 2000);
      },
    });

    console.log('🔄 Redis client initialized from URL');
  } else {
    // Standalone Redis setup with individual parameters
    client = new Redis({
      host,
      port,
      password,
      username,
      maxRetriesPerRequest,
      enableReadyCheck: true,
      lazyConnect,
      retryStrategy: (times) => {
        // Exponential backoff with max 2 seconds
        return Math.min(times * 50, 2000);
      },
    });

    console.log(`🔄 Redis client initialized at ${host}:${port}`);
  }

  // Event listeners
  client.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  client.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  client.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
  });

  client.on('close', () => {
    console.log('⚠️ Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  // Graceful shutdown
  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) {
      return; // Prevent multiple shutdown attempts
    }

    isShuttingDown = true;
    console.log('🛑 Shutting down Redis client...');

    try {
      const status = client.status;

      // Only try to quit if connection is still active
      if (status === 'ready' || status === 'connect' || status === 'connecting') {
        await client.quit();
        console.log('✅ Redis client closed gracefully');
      } else {
        console.log('ℹ️ Redis connection already closed');
        client.disconnect();
      }
    } catch (error) {
      console.error('❌ Error closing Redis client:', error);
      client.disconnect();
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return client;
}

/**
 * Create a standalone Redis client (non-cluster)
 * This is a convenience function that explicitly returns Redis type
 * for use cases where type narrowing is required
 *
 * @param config - Standalone Redis configuration
 * @returns Configured Redis instance (guaranteed non-cluster)
 *
 * @example
 * ```typescript
 * const redis = createStandaloneRedisClient({
 *   host: 'localhost',
 *   port: 6379
 * });
 * // redis is typed as Redis, not Redis | Cluster
 * ```
 */
export function createStandaloneRedisClient(
  config: Omit<RedisConfig, 'clusterNodes' | 'isProduction'> = {}
): Redis {
  const {
    url,
    host = 'localhost',
    port = 6379,
    password,
    username,
    maxRetriesPerRequest = 3,
    lazyConnect = false,
  } = config;

  let client: Redis;

  if (url) {
    // URL-based connection
    client = new Redis(url, {
      maxRetriesPerRequest,
      enableReadyCheck: true,
      lazyConnect,
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
    });

    console.log('🔄 Standalone Redis client initialized from URL');
  } else {
    // Host/port based connection
    client = new Redis({
      host,
      port,
      password,
      username,
      maxRetriesPerRequest,
      enableReadyCheck: true,
      lazyConnect,
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
    });

    console.log(`🔄 Standalone Redis client initialized at ${host}:${port}`);
  }

  // Event listeners
  client.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  client.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  client.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
  });

  client.on('close', () => {
    console.log('⚠️ Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  // Graceful shutdown
  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log('🛑 Shutting down Redis client...');

    try {
      const status = client.status;

      if (status === 'ready' || status === 'connect' || status === 'connecting') {
        await client.quit();
        console.log('✅ Redis client closed gracefully');
      } else {
        console.log('ℹ️ Redis connection already closed');
        client.disconnect();
      }
    } catch (error) {
      console.error('❌ Error closing Redis client:', error);
      client.disconnect();
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return client;
}

/**
 * Check if Redis client is connected and ready
 *
 * @param client - Redis or Cluster instance
 * @returns Promise resolving to connection status
 */
export async function checkRedisHealth(client: Redis | Cluster): Promise<boolean> {
  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
