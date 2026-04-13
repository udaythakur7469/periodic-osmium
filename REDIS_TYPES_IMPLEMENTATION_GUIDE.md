# 🔧 Fix Guide: TypeScript Redis Client Type Narrowing

## 📋 Summary of Changes

**Problem:** `createRedisClient()` always returns `Redis | Cluster` type, causing TypeScript errors when users need a strict `Redis` type for packages that don't accept `Cluster`.

**Solution:** Implement **function overloads** with type guards AND add a dedicated `createStandaloneRedisClient()` function for guaranteed `Redis` type.

---

## ✅ Files Modified

### 1️⃣ **src/core/redis.ts** (Main Fix)
### 2️⃣ **src/index.ts** (Export new function)
### 3️⃣ **package.json** (Version Bump)

---

## 🔍 Detailed Changes

### **File 1: src/core/redis.ts**

This file gets **THREE** major additions:

#### Addition 1: Type Definitions for Config Narrowing
**Add after line 2** (after imports):

```typescript
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
```

**Why:** These types enable TypeScript to differentiate cluster vs standalone configs.

---

#### Addition 2: Function Overload Signatures
**Add BEFORE line 26** (before the existing `createRedisClient` function):

```typescript
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
```

**Why:** These overloads tell TypeScript:
- If you pass `{ clusterNodes, isProduction: true }` → returns `Cluster`
- If you pass anything else or nothing → returns `Redis`

---

#### Addition 3: New `createStandaloneRedisClient()` Function
**Add AFTER the existing `createRedisClient` function** (after line 154):

```typescript
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
export function createStandaloneRedisClient(config: Omit<RedisConfig, 'clusterNodes' | 'isProduction'> = {}): Redis {
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
```

**Why:** Provides a guaranteed `Redis` type for users who only need standalone Redis.

---

### **File 2: src/index.ts**

#### Change: Export the new function
**Replace line 19:**

**BEFORE:**
```typescript
export { createRedisClient, checkRedisHealth } from './core/redis';
```

**AFTER:**
```typescript
export { 
  createRedisClient, 
  createStandaloneRedisClient,
  checkRedisHealth 
} from './core/redis';
```

---

### **File 3: package.json**

#### Change: Version Bump
**Line 3:**

**BEFORE:**
```json
"version": "1.0.2",
```

**AFTER:**
```json
"version": "1.0.4",
```

---

## 🎯 How the Type System Works Now

### **Scenario 1: Cluster Configuration**
```typescript
const cluster = createRedisClient({
  clusterNodes: ['node1:6379', 'node2:6379'],
  isProduction: true
});
// TypeScript knows: cluster is Cluster ✅
```

### **Scenario 2: Standalone Configuration**
```typescript
const redis = createRedisClient({
  host: 'localhost',
  port: 6379
});
// TypeScript knows: redis is Redis ✅
```

### **Scenario 3: No Configuration**
```typescript
const redis = createRedisClient();
// TypeScript knows: redis is Redis ✅
```

### **Scenario 4: Guaranteed Standalone (New!)**
```typescript
const redis = createStandaloneRedisClient({
  host: 'localhost',
  port: 6379
});
// TypeScript knows: redis is Redis (guaranteed, no Cluster possible) ✅
```

---

## 📝 Step-by-Step Implementation Guide

### Step 1: Backup Current Files
```bash
cd periodic-osmium-main
cp src/core/redis.ts src/core/redis.ts.backup
cp src/index.ts src/index.ts.backup
cp package.json package.json.backup
```

### Step 2: Update redis.ts

Open `src/core/redis.ts`:

1. **After line 2** (after imports), add:
   - `ClusterConfig` interface
   - `StandaloneConfig` interface

2. **Before line 26** (before `export function createRedisClient`), add:
   - Two function overload signatures

3. **After the existing `createRedisClient` function** (after line 154), add:
   - Complete `createStandaloneRedisClient()` function

### Step 3: Update index.ts

Open `src/index.ts`:

1. **Line 19**: Update export to include `createStandaloneRedisClient`

### Step 4: Update package.json

Open `package.json`:

1. **Line 3**: Change version to `"1.0.4"`

### Step 5: Build and Test
```bash
# Install dependencies (if needed)
npm install

# Build the package
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Test type narrowing
cat > test-types.ts << 'EOF'
import { createRedisClient, createStandaloneRedisClient } from './src';

// Should infer as Redis
const redis1 = createRedisClient();
const redis2 = createRedisClient({ host: 'localhost' });

// Should infer as Cluster
const cluster = createRedisClient({
  clusterNodes: ['node1:6379'],
  isProduction: true
});

// Guaranteed Redis type
const redis3 = createStandaloneRedisClient({ host: 'localhost' });
EOF

npx tsc test-types.ts --noEmit
```

### Step 6: Verify the Fix

The following should NOT show type errors:

```typescript
import { createStandaloneRedisClient } from '@periodic/osmium';

// This function expects strictly Redis type
function processRedisClient(client: Redis) {
  // do something
}

const redis = createStandaloneRedisClient({ host: 'localhost' });
processRedisClient(redis); // ✅ No type error!
```

---

## 🚀 Publishing the Fix

### Commit Message:
```
feat: add TypeScript function overloads for precise Redis/Cluster type inference
```

### Alternative (detailed):
```
feat(types): add function overloads and createStandaloneRedisClient for type safety

- Add ClusterConfig and StandaloneConfig type definitions
- Implement function overloads for createRedisClient to return correct type
- Add createStandaloneRedisClient function for guaranteed Redis type
- Update exports to include new standalone client creator
- Bump version to 1.0.4

Resolves TypeScript error: "Type 'Redis | Cluster' is not assignable to type 'Redis'"
```

### Full Git Commands:
```bash
# Stage changes
git add src/core/redis.ts src/index.ts package.json

# Commit
git commit -m "feat: add TypeScript function overloads for precise Redis/Cluster type inference"

# Tag the version
git tag v1.0.4

# Push to GitHub
git push origin main
git push origin v1.0.4

# Publish to npm
npm run build
npm publish
```

---

## 🔍 What NOT to Change

❌ **Do NOT change:**
- Any runtime logic or behavior
- The internal implementation of `createRedisClient`
- Error handling logic
- Event listeners
- Graceful shutdown logic
- Other files (cache.ts, types.ts, express.ts, etc.)

✅ **ONLY change:**
- Add type definitions (interfaces)
- Add function overload signatures
- Add new `createStandaloneRedisClient` function
- Export the new function
- Bump version number

---

## 📊 Before vs After Comparison

### BEFORE (Problematic):
```typescript
export function createRedisClient(config: RedisConfig = {}): Redis | Cluster {
  // implementation
}

// Usage
const redis = createRedisClient({ host: 'localhost' });
// Type: Redis | Cluster ❌

function needsStrictRedis(client: Redis) { }
needsStrictRedis(redis); // ❌ Type error!
```

### AFTER (Fixed):
```typescript
// Overload 1
export function createRedisClient(config: ClusterConfig): Cluster;
// Overload 2
export function createRedisClient(config?: StandaloneConfig): Redis;
// Implementation
export function createRedisClient(config: RedisConfig = {}): Redis | Cluster {
  // implementation
}

// New function
export function createStandaloneRedisClient(config = {}): Redis {
  // guaranteed Redis type
}

// Usage
const redis = createRedisClient({ host: 'localhost' });
// Type: Redis ✅

const cluster = createRedisClient({ 
  clusterNodes: ['node1:6379'], 
  isProduction: true 
});
// Type: Cluster ✅

const standalone = createStandaloneRedisClient({ host: 'localhost' });
// Type: Redis (guaranteed) ✅

function needsStrictRedis(client: Redis) { }
needsStrictRedis(redis); // ✅ Works!
needsStrictRedis(standalone); // ✅ Works!
```

---

## ✅ Verification Checklist

After making changes:

- [ ] `npm run build` succeeds without errors
- [ ] `npx tsc --noEmit` shows no type errors
- [ ] Type inference works correctly for both cluster and standalone
- [ ] `createStandaloneRedisClient` is exported
- [ ] Existing code using `createRedisClient()` still works
- [ ] No runtime behavior changes
- [ ] Version bumped to 1.0.4
- [ ] Git commit created
- [ ] Ready to publish

---

## 🆘 Troubleshooting

### Issue: "Cannot find name 'ClusterConfig'"
**Solution:** Make sure you added the interface definitions at the top of redis.ts

### Issue: "Overload signatures must all be exported or non-exported"
**Solution:** Ensure all three function signatures have the `export` keyword

### Issue: Build fails with "duplicate function implementation"
**Solution:** The overload signatures should come BEFORE the implementation, not after

### Issue: Type still shows as `Redis | Cluster`
**Solution:** Clear your TypeScript cache: `rm -rf node_modules/.cache`

---

## 🎁 Bonus: Migration Examples

### For Users of Your Package

**Old way (still works):**
```typescript
const redis = createRedisClient({ host: 'localhost' });
// Type is now inferred as Redis instead of Redis | Cluster
```

**New way (guaranteed type):**
```typescript
const redis = createStandaloneRedisClient({ host: 'localhost' });
// Explicit Redis type, cannot be Cluster
```

**Cluster (unchanged):**
```typescript
const cluster = createRedisClient({
  clusterNodes: ['node1:6379'],
  isProduction: true
});
// Type is correctly inferred as Cluster
```

---

**All changes are backward compatible and only improve TypeScript type inference!** ✅
