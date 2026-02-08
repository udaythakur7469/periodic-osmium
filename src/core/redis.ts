import { Redis, Cluster } from 'ioredis';
import { RedisConfig } from './types';

/**
 * Create and configure a Redis client
 * Supports both standalone Redis and Redis Cluster
 *
 * @param config - Redis configuration options
 * @returns Configured Redis or Cluster instance
 *
 * @example
 * ```typescript
 * // Standalone Redis
 * const redis = createRedisClient({
 *   host: 'localhost',
 *   port: 6379
 * });
 *
 * // Redis Cluster
 * const redis = createRedisClient({
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
