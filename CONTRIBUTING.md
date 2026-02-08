# Contributing to Periodic Osmium

First off, thank you for considering contributing to Periodic Osmium! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

---

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (Node version, OS, etc.)
- **Code samples** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why is this enhancement needed?
- **Proposed solution** (optional)
- **Alternative solutions** considered (optional)

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Add tests if applicable
4. Ensure tests pass
5. Update documentation
6. Submit a pull request

---

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 16.0.0
- Redis server (for tests)
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/periodic-osmium.git
cd periodic-osmium

# Install dependencies
npm install

# Build the project
npm run build

# Run tests (requires Redis running on localhost:6379)
npm test

# Run linter
npm run lint

# Format code
npm run format
```

### Running Redis for Development

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
# macOS: brew install redis && redis-server
# Ubuntu: sudo apt-get install redis-server && redis-server
```

---

## 🔄 Pull Request Process

1. **Update documentation** - If you change APIs, update README.md
2. **Add tests** - For new features or bug fixes
3. **Follow coding standards** - Run `npm run lint` and `npm run format`
4. **Update CHANGELOG.md** - Add your changes under `[Unreleased]`
5. **Ensure CI passes** - All tests and linting must pass
6. **Request review** - Tag maintainers for review

### PR Title Format

Use conventional commits format:

- `feat: add cache warming strategy`
- `fix: resolve memory leak in pattern deletion`
- `docs: update API reference`
- `test: add tests for tag invalidation`
- `refactor: improve cache key generation`
- `chore: update dependencies`

---

## 💻 Coding Standards

### TypeScript

- Use TypeScript for all code
- Maintain strict type checking
- Export all public types
- Document complex types with JSDoc

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

### File Organization

```
src/
├── core/           # Framework-agnostic logic
├── adapters/       # Framework-specific adapters
├── utils/          # Utility functions
└── index.ts        # Public API exports
```

### Naming Conventions

- **Files**: kebab-case (`cache-service.ts`)
- **Classes**: PascalCase (`CacheService`)
- **Functions**: camelCase (`getCacheKey`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TTL`)
- **Interfaces**: PascalCase with `I` prefix (`ICacheService`)

---

## 🧪 Testing Guidelines

### Writing Tests

- Place tests in `tests/` directory
- Name test files: `*.test.ts`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    test('should do something specific', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- Aim for >80% coverage
- Cover edge cases and error paths
- Test both success and failure scenarios

---

## 📝 Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Document parameters and return types
- Include usage examples for complex functions

```typescript
/**
 * Set cache value with optional TTL and tags
 * 
 * @param key - Cache key
 * @param value - Value to cache (will be JSON serialized)
 * @param ttl - Time to live in seconds (optional)
 * @param tags - Tags for invalidation (optional)
 * @returns Success status
 * 
 * @example
 * ```typescript
 * await cache.set('user:123', userData, 300, ['users']);
 * ```
 */
async set(key: string, value: any, ttl?: number, tags?: string[]): Promise<boolean>
```

### README Updates

- Update examples if APIs change
- Keep feature list current
- Add new use cases

---

## 🏗️ Project Structure

```
periodic-osmium/
├── src/              # Source code
├── tests/            # Test files
├── examples/         # Usage examples
├── .github/          # GitHub workflows
├── dist/             # Compiled output (gitignored)
└── coverage/         # Test coverage (gitignored)
```

---

## 🚀 Release Process

Maintainers only:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.x.x`
4. Push tag: `git push origin v1.x.x`
5. GitHub Actions will publish to npm

---

## ❓ Questions?

- Open a [GitHub Discussion](https://github.com/udaythakur7469/periodic-osmium/discussions)
- Email: udaythakurwork@gmail.com

---

## 🙏 Thank You!

Your contributions make Periodic Osmium better for everyone!

---

**Happy coding! 🎉**