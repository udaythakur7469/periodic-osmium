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

## [1.0.0] - 2025-02-08

### Added
- Initial release of periodic-osmium
- Auto-caching for GET requests
- Tag-based cache invalidation
- Pattern-based cache clearing
- Redis Cluster support
- User-specific caching with `includeAuth`
- Non-blocking cache invalidation
- Automatic data compression for large values
- Custom cache key generation
- Conditional caching support
- Manual cache control via `req.cache`
- TypeScript support with full type definitions
- Comprehensive documentation and examples
- Unit tests with Jest
- ESLint and Prettier configuration
- GitHub Actions CI/CD pipeline

### Features
- CacheService class with namespacing
- Redis client factory with cluster support
- Express middleware with flexible strategies
- Cache headers (X-Cache, X-Cache-Key)
- Health check functionality
- TTL management
- Batch operations for tags and patterns

### Performance
- Non-blocking SCAN for pattern deletion
- Pipeline operations for bulk invalidation
- Compression threshold at 1KB
- Efficient tag-based lookups

### Documentation
- Complete README with examples
- API reference documentation
- Setup and contribution guidelines
- Quick start guide

[Unreleased]: https://github.com/udaythakur7469/periodic-osmium/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/udaythakur7469/periodic-osmium/releases/tag/v1.0.0