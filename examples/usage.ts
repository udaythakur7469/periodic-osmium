/**
 * Periodic Osmium - Usage Examples
 *
 * This file demonstrates various ways to use the caching middleware
 */

import express from 'express';
import { createRedisClient, cacheMiddleware } from '../src';

const app = express();
const redis = createRedisClient({
  host: 'localhost',
  port: 6379,
});

app.use(express.json());

// =========================================
// Example 1: Basic Auto-Caching
// =========================================

app.get(
  '/api/users',
  cacheMiddleware(redis, {
    ttl: 300, // Cache for 5 minutes
    autoCache: {
      tags: ['users'],
    },
  }),
  async (req, res) => {
    // Simulate database query
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    res.json(users);
  }
);

// =========================================
// Example 2: User-Specific Caching
// =========================================

// Assuming you have auth middleware that sets req.user
const authMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 123, role: 'admin' }; // Mock user
  next();
};

app.get(
  '/api/dashboard',
  authMiddleware,
  cacheMiddleware(redis, {
    ttl: 180,
    autoCache: {
      includeAuth: true, // Different cache per user
      tags: (req) => [`user:${(req as any).user.id}:dashboard`],
    },
  }),
  async (req, res) => {
    const dashboard = {
      userId: (req as any).user.id,
      stats: { posts: 42, followers: 1337 },
    };
    res.json(dashboard);
  }
);

// =========================================
// Example 3: Custom Cache Key Generator
// =========================================

app.get(
  '/api/products/search',
  cacheMiddleware(redis, {
    ttl: 600,
    autoCache: {
      keyGenerator: (req) => {
        const { q, category, page } = req.query;
        return `search:${q}:cat:${category}:page:${page}`;
      },
      tags: ['products', 'search'],
    },
  }),
  async (req, res) => {
    const { q, category, page = 1 } = req.query;
    const results = { query: q, category, page, items: [] };
    res.json(results);
  }
);

// =========================================
// Example 4: Conditional Caching
// =========================================

app.get(
  '/api/data',
  cacheMiddleware(redis, {
    autoCache: {
      condition: (req) => {
        // Only cache for non-admin users
        return (req as any).user?.role !== 'admin';
      },
      tags: ['data'],
    },
  }),
  async (req, res) => {
    const data = { timestamp: Date.now() };
    res.json(data);
  }
);

// =========================================
// Example 5: Cache Invalidation on Create
// =========================================

app.post(
  '/api/users',
  cacheMiddleware(redis, {
    invalidate: {
      tags: ['users'],
      patterns: ['GET:/api/users:*'],
      afterResponse: true, // Non-blocking
    },
  }),
  async (req, res) => {
    const newUser = { id: Date.now(), ...req.body };
    res.status(201).json(newUser);
  }
);

// =========================================
// Example 6: Specific Cache Invalidation
// =========================================

app.put(
  '/api/users/:id',
  cacheMiddleware(redis, {
    invalidate: {
      tags: (req) => [`user:${req.params.id}`, 'users'],
      keys: (req) => [`user:${req.params.id}`, `GET:/api/users/${req.params.id}`],
      afterResponse: true,
    },
  }),
  async (req, res) => {
    const userId = req.params.id;
    const updatedUser = { id: userId, ...req.body };
    res.json(updatedUser);
  }
);

// =========================================
// Example 7: Manual Cache Control
// =========================================

app.get('/api/custom', cacheMiddleware(redis, { strategy: 'manual' }), async (req, res) => {
  const cacheKey = 'custom:data';

  // Try to get from cache
  const cached = await req.cache.get(cacheKey);
  if (cached) {
    return res.json({ ...cached, fromCache: true });
  }

  // Fetch fresh data
  const data = { value: Math.random(), timestamp: Date.now() };

  // Store in cache with custom TTL and tags
  await req.cache.set(cacheKey, data, 120, ['custom']);

  res.json({ ...data, fromCache: false });
});

// =========================================
// Example 8: Cache-Aside Pattern
// =========================================

app.get('/api/expensive', cacheMiddleware(redis, { strategy: 'manual' }), async (req, res) => {
  const data = await req.cache.getOrSet(
    'expensive:computation',
    async () => {
      // Expensive operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { result: 'computed value' };
    },
    300, // TTL
    ['expensive']
  );

  res.json(data);
});

// =========================================
// Example 9: Health Check Endpoint
// =========================================

app.get('/health/cache', async (req, res) => {
  const healthy = await req.cache.healthCheck();
  res.json({
    status: healthy ? 'healthy' : 'degraded',
    redis: healthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// =========================================
// Example 10: Complex Invalidation
// =========================================

app.delete(
  '/api/products/:id',
  cacheMiddleware(redis, {
    invalidate: {
      tags: (req) => [`product:${req.params.id}`, 'products', 'search'],
      patterns: ['GET:/api/products:*', 'search:*'],
      keys: (req) => [`product:${req.params.id}`],
      afterResponse: true,
    },
  }),
  async (req, res) => {
    const productId = req.params.id;
    // Delete product from database
    res.json({ deleted: productId });
  }
);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/users`);
});
