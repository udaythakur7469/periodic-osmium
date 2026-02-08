# 🧪 Periodic Osmium

[![npm version](https://img.shields.io/npm/v/periodic-osmium.svg)](https://www.npmjs.com/package/@periodic/osmium)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**Production-grade Redis caching middleware for Express.js**

Part of the **Periodic** series of Node.js middleware packages by Uday Thakur.

---

## ✨ Features

- ⚡ **Auto-caching** - Automatic caching for GET requests with zero code changes
- 🏷️ **Tag-based invalidation** - Intelligently invalidate related cache entries
- 🔄 **Pattern matching** - Bulk cache clearing with wildcard patterns
- 🎯 **User-specific caching** - Built-in support for authenticated user caching
- 🚀 **Non-blocking operations** - Invalidation happens after response for optimal latency
- 🔒 **Redis Cluster support** - Horizontal scaling with Redis Cluster
- 📦 **Compression** - Automatic compression for large cached values
- 🛡️ **TypeScript** - Full type safety and IntelliSense support
- 🎨 **Flexible strategies** - Auto, manual, or disabled caching per route
- ⚙️ **Configurable TTL** - Per-route or global time-to-live settings

---

## 📦 Installation

```bash
npm install periodic-osmium ioredis
```

Or with yarn:

```bash
yarn add periodic-osmium ioredis
```

---

## 🚀 Quick Start

```typescript
import express from 'express';
import { createRedisClient, cacheMiddleware } from 'periodic-osmium';

const app = express();

// Create Redis client
const redis = createRedisClient({
  host: 'localhost',
  port: 6379,
});

// Auto-cache GET requests
app.get(
  '/api/users',
  cacheMiddleware(redis, {
    ttl: 300, // Cache for 5 minutes
    autoCache: {
      tags: ['users'], // Tag for invalidation
    },
  }),
  async (req, res) => {
    const users = await getUsersFromDatabase();
    res.json(users);
  }
);

// Invalidate cache on mutation
app.post(
  '/api/users',
  cacheMiddleware(redis, {
    invalidate: {
      tags: ['users'], // Invalidate all 'users' tagged cache
      afterResponse: true, // Non-blocking invalidation
    },
  }),
  async (req, res) => {
    const newUser = await createUser(req.body);
    res.json(newUser);
  }
);

app.listen(3000);
```

---

## 📖 Core Concepts

### 1. Auto-Caching (GET Requests)

Auto-caching automatically stores responses from GET requests and serves them from cache on subsequent requests.

```typescript
app.get(
  '/api/products',
  cacheMiddleware(redis, {
    strategy: 'auto',
    ttl: 600, // 10 minutes
    autoCache: {
      enabled: true,
      tags: ['products', 'catalog'],
    },
  }),
  getProductsController
);
```

**How it works:**
1. First request → Cache MISS → Executes controller → Caches response
2. Subsequent requests → Cache HIT → Returns cached data immediately
3. Response headers indicate cache status: `X-Cache: HIT` or `X-Cache: MISS`

### 2. Tag-Based Invalidation

Tags allow you to group related cache entries and invalidate them together.

```typescript
// Cache with tags
app.get('/api/products/:id', 
  cacheMiddleware(redis, {
    autoCache: {
      tags: (req) => ['products', `product:${req.params.id}`],
    },
  }),
  getProductController
);

// Invalidate specific product
app.put('/api/products/:id',
  cacheMiddleware(redis, {
    invalidate: {
      tags: (req) => [`product:${req.params.id}`],
      afterResponse: true,
    },
  }),
  updateProductController
);

// Invalidate all products
app.post('/api/products',
  cacheMiddleware(redis, {
    invalidate: {
      tags: ['products'],
      patterns: ['list:*'], // Also clear list caches
    },
  }),
  createProductController
);
```

### 3. Cache Strategies

**Auto Strategy (Default)**
```typescript
cacheMiddleware(redis, { strategy: 'auto' })
// GET → Auto-cached
// POST/PUT/DELETE → Auto-invalidated
```

**Manual Strategy**
```typescript
app.get('/api/custom',
  cacheMiddleware(redis, { strategy: 'manual' }),
  async (req, res) => {
    // Use req.cache manually
    const cached = await req.cache.get('my-key');
    if (cached) return res.json(cached);
    
    const data = await fetchData();
    await req.cache.set('my-key', data, 300);
    res.json(data);
  }
);
```

**None Strategy**
```typescript
cacheMiddleware(redis, { strategy: 'none' })
// Cache service attached but no automatic behavior
```

---

## 🎯 Advanced Usage

### User-Specific Caching

Cache different responses for different users:

```typescript
app.get(
  '/api/dashboard',
  authMiddleware, // Adds req.user
  cacheMiddleware(redis, {
    autoCache: {
      includeAuth: true, // Includes user ID in cache key
      tags: (req) => [`user:${req.user.id}:dashboard`],
    },
  }),
  getDashboardController
);
```

### Custom Cache Keys

Generate custom cache keys based on query parameters:

```typescript
app.get(
  '/api/search',
  cacheMiddleware(redis, {
    autoCache: {
      keyGenerator: (req) => {
        const { query, page, limit } = req.query;
        return `search:${query}:${page}:${limit}`;
      },
      tags: ['search-results'],
    },
  }),
  searchController
);
```

### Conditional Caching

Only cache under certain conditions:

```typescript
app.get(
  '/api/data',
  cacheMiddleware(redis, {
    autoCache: {
      condition: (req) => {
        // Only cache if user is not admin
        return req.user?.role !== 'admin';
      },
    },
  }),
  getDataController
);
```

### Pattern-Based Invalidation

Clear multiple related cache entries:

```typescript
app.post(
  '/api/bulk-update',
  cacheMiddleware(redis, {
    invalidate: {
      patterns: ['list:*', 'search:*', 'detail:*'],
      afterResponse: true,
    },
  }),
  bulkUpdateController
);
```

---

## 🔧 API Reference

### `createRedisClient(config: RedisConfig)`

Creates a Redis client instance.

**Parameters:**
- `config.host` - Redis host (default: 'localhost')
- `config.port` - Redis port (default: 6379)
- `config.password` - Redis password
- `config.clusterNodes` - Array of cluster nodes (e.g., ['node1:6379', 'node2:6379'])
- `config.isProduction` - Enable cluster mode (default: false)

**Returns:** Redis or Cluster instance

### `cacheMiddleware(redisClient, config: CacheConfig)`

Express middleware for caching.

**Parameters:**
- `config.strategy` - 'auto' | 'manual' | 'none' (default: 'auto')
- `config.ttl` - Time to live in seconds (default: 3600)
- `config.namespace` - Cache namespace (default: 'app')
- `config.autoCache` - Auto-cache configuration
- `config.invalidate` - Invalidation configuration

**Returns:** Express middleware function

### Cache Service Methods (via `req.cache`)

```typescript
// Get cached value
await req.cache.get(key: string): Promise<any>

// Set cache value
await req.cache.set(key: string, value: any, ttl?: number, tags?: string[]): Promise<boolean>

// Delete specific key
await req.cache.del(key: string): Promise<boolean>

// Invalidate by tags
await req.cache.invalidateByTags(tags: string[]): Promise<number>

// Delete by pattern
await req.cache.delPattern(pattern: string): Promise<number>

// Get or set (cache-aside pattern)
await req.cache.getOrSet(key: string, fetcher: () => Promise<any>, ttl?: number, tags?: string[]): Promise<any>

// Check if key exists
await req.cache.exists(key: string): Promise<boolean>

// Get TTL
await req.cache.ttl(key: string): Promise<number>

// Increment counter
await req.cache.incr(key: string): Promise<number>

// Health check
await req.cache.healthCheck(): Promise<boolean>
```

---

## 📊 Real-World Example

```typescript
import express from 'express';
import { createRedisClient, cacheMiddleware } from 'periodic-osmium';

const app = express();
const redis = createRedisClient({ host: 'localhost', port: 6379 });

// List all products (cached for 5 minutes)
app.get(
  '/api/products',
  cacheMiddleware(redis, {
    ttl: 300,
    autoCache: {
      tags: ['products-list'],
      keyGenerator: (req) => {
        const { page = 1, limit = 10, category } = req.query;
        return `products:page:${page}:limit:${limit}:category:${category}`;
      },
    },
  }),
  async (req, res) => {
    const products = await db.products.findMany(req.query);
    res.json(products);
  }
);

// Get single product (cached for 10 minutes)
app.get(
  '/api/products/:id',
  cacheMiddleware(redis, {
    ttl: 600,
    autoCache: {
      tags: (req) => ['products', `product:${req.params.id}`],
      keyGenerator: (req) => `product:${req.params.id}`,
    },
  }),
  async (req, res) => {
    const product = await db.products.findById(req.params.id);
    res.json(product);
  }
);

// Create product - invalidate lists and searches
app.post(
  '/api/products',
  cacheMiddleware(redis, {
    invalidate: {
      tags: ['products-list', 'products-search'],
      patterns: ['products:page:*'],
      afterResponse: true,
    },
  }),
  async (req, res) => {
    const product = await db.products.create(req.body);
    res.json(product);
  }
);

// Update product - invalidate specific product and lists
app.put(
  '/api/products/:id',
  cacheMiddleware(redis, {
    invalidate: {
      tags: (req) => [
        `product:${req.params.id}`,
        'products-list',
        'products-search',
      ],
      keys: (req) => [`product:${req.params.id}`],
      afterResponse: true,
    },
  }),
  async (req, res) => {
    const product = await db.products.update(req.params.id, req.body);
    res.json(product);
  }
);

app.listen(3000);
```

---

## 🎨 Cache Headers

The middleware adds helpful headers to responses:

- `X-Cache: HIT` - Response served from cache
- `X-Cache: MISS` - Response generated and cached
- `X-Cache: ERROR` - Cache error occurred
- `X-Cache-Key: <key>` - The cache key used

Monitor these in your logs or browser dev tools!

---

## 🔍 Best Practices

### 1. Choose Appropriate TTLs
```typescript
// Frequently changing data - short TTL
ttl: 60  // 1 minute

// Relatively stable data - medium TTL
ttl: 300  // 5 minutes

// Rarely changing data - long TTL
ttl: 3600  // 1 hour
```

### 2. Use Namespaces
```typescript
// Separate caches by app or environment
cacheMiddleware(redis, {
  namespace: 'prod:api',
  // vs
  namespace: 'dev:api',
})
```

### 3. Tag Strategically
```typescript
// Hierarchical tags for granular invalidation
tags: [
  'products',              // All products
  `category:${catId}`,     // Category-specific
  `product:${productId}`,  // Single product
]
```

### 4. Non-Blocking Invalidation
```typescript
// Always use afterResponse for mutations
invalidate: {
  afterResponse: true, // User gets response immediately
}
```

### 5. Monitor Cache Performance
```typescript
app.get('/health/cache', async (req, res) => {
  const healthy = await req.cache.healthCheck();
  res.json({ redis: healthy ? 'ok' : 'error' });
});
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Note:** Tests require a running Redis instance on localhost:6379 (or configure via environment variables).

---

## 🔒 Environment Variables

Recommended `.env` setup:

```env
# Development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Production
NODE_ENV=production
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
REDIS_PASSWORD=your-secure-password
```

---

## 📈 Performance

Periodic Osmium is designed for high performance:

- **Non-blocking SCAN** for pattern deletion (doesn't block Redis)
- **Pipeline operations** for bulk invalidation
- **Automatic compression** for values > 1KB
- **Efficient tag-based lookups** using Redis sets
- **Lazy connections** to reduce startup time

---

## 🤝 Related Packages

Part of the **Periodic** series:

- [**periodic-titanium**](https://github.com/udaythakur7469/periodic-titanium) - Rate limiting middleware

---

## 📝 License

MIT © [Uday Thakur](LICENSE)

---

## 🙏 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📞 Support

- 📧 Email: udaythakurwork@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/udaythakur7469/periodic-osmium/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/udaythakur7469/periodic-osmium/discussions)

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ by Uday Thakur**