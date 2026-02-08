# ⚡ Quick Start Guide

Get up and running with Periodic Osmium in 5 minutes!

---

## 📦 Installation

```bash
npm install periodic-osmium ioredis
```

---

## 🚀 Basic Usage

### 1. Setup Redis and Express

```typescript
import express from 'express';
import { createRedisClient, cacheMiddleware } from 'periodic-osmium';

const app = express();
const redis = createRedisClient({
  host: 'localhost',
  port: 6379,
});
```

### 2. Add Auto-Caching

```typescript
app.get(
  '/api/users',
  cacheMiddleware(redis, {
    ttl: 300, // 5 minutes
  }),
  async (req, res) => {
    const users = await db.users.findAll();
    res.json(users);
  }
);
```

### 3. Add Cache Invalidation

```typescript
app.post(
  '/api/users',
  cacheMiddleware(redis, {
    invalidate: {
      patterns: ['GET:/api/users:*'],
      afterResponse: true,
    },
  }),
  async (req, res) => {
    const newUser = await db.users.create(req.body);
    res.json(newUser);
  }
);
```

---

## 🎯 Common Patterns

### Tag-Based Invalidation

```typescript
// Cache with tags
app.get('/api/products', 
  cacheMiddleware(redis, {
    autoCache: { tags: ['products'] }
  }),
  getProducts
);

// Invalidate by tag
app.post('/api/products',
  cacheMiddleware(redis, {
    invalidate: { tags: ['products'] }
  }),
  createProduct
);
```

### User-Specific Caching

```typescript
app.get('/api/dashboard',
  authMiddleware,
  cacheMiddleware(redis, {
    autoCache: {
      includeAuth: true,
      tags: (req) => [`user:${req.user.id}`],
    },
  }),
  getDashboard
);
```

### Manual Cache Control

```typescript
app.get('/api/custom',
  cacheMiddleware(redis, { strategy: 'manual' }),
  async (req, res) => {
    const cached = await req.cache.get('my-key');
    if (cached) return res.json(cached);
    
    const data = await fetchData();
    await req.cache.set('my-key', data, 300);
    res.json(data);
  }
);
```

---

## 📊 Check Cache Status

```typescript
app.get('/health/cache', async (req, res) => {
  const healthy = await req.cache.healthCheck();
  res.json({ redis: healthy ? 'ok' : 'error' });
});
```

View cache headers in responses:
- `X-Cache: HIT` = Served from cache
- `X-Cache: MISS` = Generated fresh

---

## 🎨 Production Setup

```typescript
const redis = createRedisClient({
  clusterNodes: ['node1:6379', 'node2:6379'],
  password: process.env.REDIS_PASSWORD,
  isProduction: true,
});

app.use(cacheMiddleware(redis, {
  namespace: 'prod',
  ttl: 600,
}));
```

---

## 📚 Next Steps

- Read the full [README](README.md) for advanced features
- Check [examples/usage.ts](examples/usage.ts) for more patterns
- See [SETUP.md](SETUP.md) for development setup

---

**Happy caching! 🎉**