# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cache warming strategies
- Redis pub/sub for multi-instance invalidation
- Prometheus metrics integration
- Cache analytics dashboard
- Compression algorithm options (gzip, brotli)
- Cache versioning support
- GraphQL adapter

## [1.0.3] - 2025-02-08

### Fixed
- **TypeScript Compatibility**: Resolved type inference issue where `cacheMiddleware()` was returning `Promise<void | Response>` instead of the expected `RequestHandler` type
  - Added explicit `RequestHandler` return type annotation to `cacheMiddleware()` function
  - Refactored async operations to use IIFE pattern to maintain synchronous function signature
  - Fixed return statements to return `void` instead of `Response` objects
  - This eliminates TypeScript errors when using the middleware in route handlers: `"Type 'Promise<void | Response>' is not assignable to type 'void | Promise<void>'"`

### Changed
- Internal implementation now uses async IIFE for cache operations while maintaining proper Express middleware typing
- All `return res.json(data)` statements changed to `res.json(data); return;` for type safety

### Technical Details
- No runtime behavior changes - purely type-level improvements
- Maintains full backward compatibility with existing code
- Improves IDE autocomplete and type checking experience

## [1.0.2] - 2025-02-07

### Fixed
- Minor bug fixes and stability improvements

## [1.0.1] - 2025-02-06

### Fixed
- Documentation improvements
- Package metadata updates

## [1.0.0] - 2025-02-05

### Added
- Initial release of @periodic/osmium
- Auto-caching for GET requests with configurable TTL
- Tag-based cache invalidation for precise control
- Pattern-based cache clearing with wildcard support
- User-specific caching with authentication integration
- Non-blocking cache invalidation for optimal performance
- Redis Cluster support for horizontal scaling
- Automatic data compression for large cached values (>1KB)
- Custom cache key generation with flexible strategies
- Conditional caching based on request context
- Manual cache control via `req.cache` service
- Complete TypeScript support with full type definitions
- Comprehensive test suite with Jest
- ESLint and Prettier configuration
- GitHub Actions CI/CD pipeline

### Features
- `CacheService` class with namespace isolation
- `createRedisClient()` factory with standalone and cluster modes
- Express middleware with three strategies: auto, manual, none
- Cache headers (`X-Cache`, `X-Cache-Key`) for debugging
- Health check functionality
- TTL management with per-route and global settings
- Batch operations for tags and patterns

### Performance
- Non-blocking SCAN for pattern deletion (avoids Redis blocking)
- Pipeline operations for bulk cache invalidation
- Compression threshold at 1KB for memory efficiency
- Efficient tag-based lookups using Redis sets
- Lazy connection support to reduce startup time

### Documentation
- Complete README with usage examples
- API reference documentation
- Setup and contribution guidelines
- Quick start guide
- 10 real-world usage examples

---

## Migration Guides

### Upgrading from 1.0.2 to 1.0.3

No code changes required! This is a **type-only fix** that improves TypeScript compatibility.

**What changed:**
- `cacheMiddleware()` now has an explicit `RequestHandler` return type
- TypeScript will no longer show type errors when using the middleware

**Action required:**
- Simply update your package: `npm install @periodic/osmium@1.0.3`
- No code changes needed in your application

**Example - Works the same before and after:**
```typescript
import { cacheMiddleware, createRedisClient } from '@periodic/osmium';

const redis = createRedisClient({ host: 'localhost' });

// This now works without TypeScript errors ✅
app.get('/users',
  cacheMiddleware(redis, { ttl: 300 }),
  getUsersController
);
```

---

## Links

- [npm Package](https://www.npmjs.com/package/@periodic/osmium)
- [GitHub Repository](https://github.com/udaythakur7469/periodic-osmium)
- [Issue Tracker](https://github.com/udaythakur7469/periodic-osmium/issues)
- [Changelog](https://github.com/udaythakur7469/periodic-osmium/blob/main/CHANGELOG.md)

---

[Unreleased]: https://github.com/udaythakur7469/periodic-osmium/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/udaythakur7469/periodic-osmium/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/udaythakur7469/periodic-osmium/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/udaythakur7469/periodic-osmium/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/udaythakur7469/periodic-osmium/releases/tag/v1.0.0